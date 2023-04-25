import { registerEvent } from '../utils/dom';
import EventBus from '../utils/EventBus';
import { colorHasAlpha, gcd, prop } from '../utils/libs';
import { DEFAULT_LIGHT_THEME, DEFAULT_THEME_STATE, JUSTIFY_NODES_OPTION } from '../consts';
import {
  Theme, ThemeParams, TNodes, TPatternLockOptions,
} from '../typings';

const createInvalidOptionError = (option: string) => new Error(`Invalid or empty ${option} passed`);

const events = {
  PATTERN_COMPLETE: 'complete',
  PATTERN_START: 'start',
};

class PatternLock {
  autoHide: boolean = false;

  autoHideTimeout: number = 400;

  _initialConfig!: TPatternLockOptions;

  $canvas!: HTMLCanvasElement;

  ctx!: CanvasRenderingContext2D;

  _subscriptions: Function[] = [];

  eventBus = EventBus();

  theme: Theme = DEFAULT_LIGHT_THEME;

  themeState: ThemeParams = DEFAULT_LIGHT_THEME[DEFAULT_THEME_STATE.INITIAL];

  justifyNodes: TPatternLockOptions['justifyNodes'] = 'space-around';

  dimens = { width: 300, height: 400 };

  coordinates: {x: number, y: number} | null = null;

  selectedNodes: Array<{row: number, col: number, pushedAt?: number}> = [];

  lastSelectedNode: typeof this.selectedNodes[number] | null = null;

  _isDragging = false;

  rows: number = 3;

  cols: number = 3;

  renderLoopRaf: number = 0;

  calculationLoopRaf: number = 0;

  resetTimeoutId = 0;

  dragListeners: Array<Function> = [];

  bounds: {x: number, y: number} = { x: 0, y: 0 };

  extraBounds: [number, number, number, number] = [0, 0, 0, 0];

  startDragTimeStamp: number | null = null;

  constructor(config: TPatternLockOptions) {
    if (!config.$canvas) throw createInvalidOptionError('$canvas');

    this.initialize(config);
  }

  initialize(config: TPatternLockOptions) {
    const {
      $canvas,
      grid,
      theme,
      width,
      height,
      themeStateKey,
      justifyNodes,
      extraBounds,
    } = config;
    this._initialConfig = config;
    this.$canvas = $canvas;
    this.autoHide = config.autoHide;
    this.autoHideTimeout = config.autoHideTimeout;
    this.ctx = this.$canvas.getContext('2d')!;
    this.theme = theme;
    this.themeState = theme[themeStateKey];
    this.justifyNodes = justifyNodes;
    this.extraBounds = extraBounds;

    this.setDimensions({ width, height });
    this.setGrid(grid[0], grid[1]);
    this.renderGrid();
    this.attachEventHandlers();
  }

  setDimensions(dimens: {width: number, height: number}) {
    this.dimens = dimens;
    const ratio = window.devicePixelRatio;

    this.$canvas.width = this.dimens.width * ratio;
    this.$canvas.height = this.dimens.height * ratio;
    this.$canvas.style.width = `${this.dimens.width}px`;
    this.$canvas.style.height = `${this.dimens.height}px`;

    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  setInitialState() {
    this.coordinates = null;
    this.selectedNodes = [];
    this.lastSelectedNode = null;
    this.themeState = this.theme[this._initialConfig.themeStateKey];

    this.forceRender();
  }

  forceRender = () => requestAnimationFrame(() => {
    const previousDragState = this._isDragging;

    this._isDragging = true;
    this.calculationLoop(false);

    requestAnimationFrame(() => {
      this.renderLoop(false);
      this._isDragging = previousDragState;
    });
  });

  setGrid(rows: number, cols:number, rerender = true) {
    this.rows = rows;
    this.cols = cols;

    this.setInitialState();
    this._onResize();

    return this;
  }

  setThemeState(themeState: string, rerender = true) {
    if (!this.theme) throw createInvalidOptionError('theme');

    this.themeState = this.theme[themeState || DEFAULT_THEME_STATE.INITIAL] || {};
    this.themeState.colors = { ...this.theme.initial.colors, ...this.themeState.colors };
    this.themeState.dimens = { ...this.theme.initial.dimens, ...this.themeState.dimens };

    if (rerender) {
      this.forceRender();
    }

    return this;
  }

  registerEventListener = (
    t: HTMLElement | typeof window |null,
    ev: string,
    fn: EventListenerOrEventListenerObject,
  ) => {
    const unsubFn = registerEvent(t, ev, fn);
    this._subscriptions.push(unsubFn);
    return unsubFn;
  };

  // Attach event listeners and start frame loops
  attachEventHandlers() {
    this.registerEventListener(this.$canvas, 'mousedown touchstart', this._onTouchStart);
    this.registerEventListener(window, 'resize', this._onResize);
  }

  // Event handler stuff start
  destroy = () => {
    this._stopDragging();
    this._subscriptions.map((fn) => fn());
  };

  _stopDragging = () => {
    cancelAnimationFrame(this.renderLoopRaf);
    cancelAnimationFrame(this.calculationLoopRaf);
    clearTimeout(this.resetTimeoutId);
    this._isDragging = false;
    this.startDragTimeStamp = null;
  };

  on(event: string, fn: Function) {
    const subscription = this.eventBus.on(event, fn);

    this._subscriptions.push(subscription);

    return subscription;
  }

  emit = (eventName: string, ...args: any) => this.eventBus.emit(eventName, ...args);

  onStart = (fn: Function) => this.on(events.PATTERN_START, fn);

  onComplete = (fn: Function) => this.on(events.PATTERN_COMPLETE, fn);

  _getCoords = (col: number, row: number) => {
    let x = 0;
    let y = 0;

    if (this.justifyNodes === JUSTIFY_NODES_OPTION.SPACE_AVAILABLE) {
      const xPartsCount = this.dimens.width / this.cols;
      const yPartsCount = this.dimens.height / this.rows;
      x = xPartsCount * col - xPartsCount / 2;
      y = yPartsCount * row - yPartsCount / 2;
    }

    if (this.justifyNodes === JUSTIFY_NODES_OPTION.SPACE_BETWEEN) {
      const { nodeRadius } = this.themeState.dimens;
      const nodeSize = nodeRadius * 2;

      const xSpace = this.dimens.width - nodeSize * this.cols;
      const xSpaceAfterNode = xSpace / (this.cols - 1);

      const ySpace = this.dimens.height - nodeSize * this.rows;
      const ySpaceAfterNode = ySpace / (this.rows - 1);

      x = nodeRadius + (col - 1) * nodeSize + (col - 1) * xSpaceAfterNode;
      y = nodeRadius + (row - 1) * nodeSize + (row - 1) * ySpaceAfterNode;
    }

    return { x, y };
  };

  _findPosByCoord = (coord: number, dimen:number, nodesCount:number) => {
    if (this.justifyNodes === JUSTIFY_NODES_OPTION.SPACE_AVAILABLE) {
      const partsCount = dimen / nodesCount;
      return Math.round((coord + partsCount / 2) / partsCount);
    }

    if (this.justifyNodes === JUSTIFY_NODES_OPTION.SPACE_BETWEEN) {
      const { nodeRadius } = this.themeState.dimens;
      const nodeSize = nodeRadius * 2;

      const space = dimen - nodeSize * nodesCount;
      const spaceAfterNode = space / (nodesCount - 1);
      return Math.round(
        (coord - nodeRadius + nodeSize + spaceAfterNode) / (nodeSize + spaceAfterNode),
      );
    }

    return 0;
  };

  _findColByX = (x:number) => this._findPosByCoord(x, this.dimens.width, this.cols);

  _findRowByY = (y:number) => this._findPosByCoord(y, this.dimens.height, this.rows);

  _emitPatternStart = () => this.emit(events.PATTERN_START, {});

  _emitPatternComplete() {
    this.emit(events.PATTERN_COMPLETE, this.selectedNodes);
  }

  // Event handler stuff end

  // recalculateBounds :: () -> Point
  recalculateBounds = () => {
    const bodyRect = document.body.getBoundingClientRect();
    const elemRect = this.$canvas!.getBoundingClientRect();
    const offset = elemRect.top - bodyRect.top;

    this.bounds = { x: elemRect.left, y: offset };
  };

  _onResize = () => requestAnimationFrame(this.recalculateBounds);

  _onTouchStart = (e: Event) => {
    this._stopDragging();
    requestAnimationFrame(this.recalculateBounds);

    // Start frame loops
    this.renderLoopRaf = requestAnimationFrame(this.renderLoop);
    this.calculationLoopRaf = requestAnimationFrame(this.calculationLoop);

    if (e) e.preventDefault();
    this.dragListeners = [
      this.registerEventListener(window, 'mousemove touchmove', this._onTouchMove),
      this.registerEventListener(window, 'mouseup touchend', this._onTouchStop),
    ];

    this.setInitialState();

    this._emitPatternStart();
    this._isDragging = true;
  };

  _onTouchStop = (e?: Event) => {
    if (e) e.preventDefault();

    (this.dragListeners || []).forEach((fn) => fn());
    this._subscriptions = this._subscriptions.filter(
      (fn) => !(this.dragListeners || []).includes(fn),
    );

    this.coordinates = null;
    this.renderLoop(false);

    if (this.selectedNodes.length > 1) {
      this._emitPatternComplete();
    }

    if (this.autoHide) {
      this.resetTimeoutId = window.setTimeout(this._stopDragging, 2 * this.autoHideTimeout);
    } else {
      this._stopDragging();
    }
  };

  _onTouchMove = (e: Event) => {
    if (e) e.preventDefault();

    if (this._isDragging) {
      let mousePoint = {
        x: prop('pageX', e) || prop('touches.0.pageX', e) || 0,
        y: prop('pageY', e) || prop('touches.0.pageY', e) || 0,
      };

      mousePoint = {
        x: mousePoint.x - this.bounds.x,
        y: mousePoint.y - this.bounds.y,
      };

      if (this.isPointInCanvas(mousePoint)) {
        this.coordinates = mousePoint;
      } else {
        this._onTouchStop();
      }
    }
  };

  /*
     * Checks if given point is within the boundaries of the canvas
     * isPointInCanvas :: Point -> Boolean
     */
  isPointInCanvas = ({ x, y } : {x: number, y: number}) => {
    const w = this.dimens.width;
    const h = this.dimens.height;
    const [top, right, bottom, left] = this.extraBounds;

    console.log(x, y);
    return x <= w + right && x > 0 - left && y <= h + bottom && y > 0 - top;
  };

  /*
     * Check if the given node is already selected
     */
  isSelected = (targetNode: TNodes[number]) => !!this.selectedNodes.filter(
    (node) => node.col === targetNode.col && node.row === targetNode.row,
  ).length;

  /*
     * Adds intermediary nodes between lastSelectedNode and the target
     */
  addIntermediaryNodes(target:TNodes[number]) {
    const stepNode = this.getIntermediaryStepDirection(this.lastSelectedNode, target);

    if (this.lastSelectedNode && (stepNode.col !== 0 || stepNode.row !== 0)) {
      let current = {
        col: this.lastSelectedNode.col + stepNode.col,
        row: this.lastSelectedNode.row + stepNode.row,
      };

      const max = Math.max(this.rows, this.cols);

      let i = 0;

      // eslint-disable-next-line no-plusplus
      while (i++ < max && (current.col !== target.col || current.row !== target.row)) {
        if (!this.isSelected(current)) {
          this.selectedNodes.push(current);
        }

        current = {
          col: current.col + stepNode.col,
          row: current.row + stepNode.row,
        };
      }
    }

    this.lastSelectedNode = target;
  }

  /*
     * Returns the step direction to select intermediary nodes
     * INFO: Can be moved out of the class as it is independent of `this`
     * getIntermediaryStepDirection :: (Node, Node) -> Node
     */
  // eslint-disable-next-line class-methods-use-this
  getIntermediaryStepDirection(prev: TNodes[number] | null, next:TNodes[number]) {
    const finalStep = { col: 0, row: 0 };

    if (!prev) {
      return finalStep;
    }

    const dRow = Math.abs(prev.col - next.col);
    const dCol = Math.abs(prev.row - next.row);

    if (dRow === 1 || dCol === 1) {
      return finalStep;
    }

    const dRsign = prev.col - next.col < 0 ? 1 : -1;
    const dCsign = prev.row - next.row < 0 ? 1 : -1;

    if (dRow === 0) {
      if (dCol !== 0) {
        finalStep.row = dCsign;
      }
    } else if (dCol === 0) {
      finalStep.col = dRsign;
    } else {
      const max = Math.max(dRow, dCol);
      const min = Math.min(dRow, dCol);
      const gcdValue = gcd(max, min);

      if (max % min === 0) {
        finalStep.row = (dCol / gcdValue) * dCsign;
        finalStep.col = (dRow / gcdValue) * dRsign;
      }
    }

    return finalStep;
  }

  getElapsedTime = (value: boolean | number) => {
    let timeStamp: number;
    if (typeof value === 'boolean') {
      timeStamp = performance.now();
    } else {
      timeStamp = value;
    }

    if (!this.startDragTimeStamp) {
      this.startDragTimeStamp = timeStamp;
    }

    return timeStamp - this.startDragTimeStamp;
  };

  // Calculate the state of the lock for the next frame
  calculationLoop = (runLoop:boolean | number = true) => {
    if (this._isDragging && this.coordinates) {
      // eslint-disable-next-line consistent-return
      this.forEachNode((x: number, y: number) => {
        const dist = Math.sqrt(
          (this.coordinates!.x - x) ** 2 + (this.coordinates!.y - y) ** 2,
        );

        if (dist < this.themeState.dimens.nodeRadius + 1) {
          const col = this._findColByX(x);
          const row = this._findRowByY(y);

          const currentNode = { col, row };

          if (!this.isSelected(currentNode)) {
            this.addIntermediaryNodes(currentNode);
            this.selectedNodes.push(currentNode);

            return false;
          }
        }
      });
    }

    if (runLoop) {
      this.calculationLoopRaf = requestAnimationFrame(this.calculationLoop);
    }
  };

  // Render the state of the lock
  renderLoop = (runLoop: boolean | number = true) => {
    if (this._isDragging) {
      const elapsed = this.getElapsedTime(runLoop);

      // Paint the grid
      this.renderGrid();
      this.drawSelected(elapsed);
    }

    if (runLoop) {
      this.renderLoopRaf = requestAnimationFrame(this.renderLoop);
    }
  };

  // Render the grid to the canvas
  renderGrid() {
    this.ctx.fillStyle = this.themeState.colors.bg;
    this.ctx.fillRect(0, 0, this.dimens.width, this.dimens.height);

    // Draw all the nodes
    this.forEachNode(this.drawNode.bind(this));
  }

  forEachNode(callback: Function) {
    const xGrid = Array(this.cols)
      .fill(null)
      .map((el, i) => this._getCoords(i + 1, 0).x);
    const yGrid = Array(this.rows)
      .fill(null)
      .map((el, i) => this._getCoords(0, i + 1).y);

    const breakException = new Error('Break Exception');

    try {
      yGrid.forEach((y) => {
        xGrid.forEach((x) => {
          if (callback(x, y) === false) throw breakException;
        });
      });
    } catch (e) {
      if (e !== breakException) throw e;
    }
  }

  drawNode(
    x: number,
    y:number,
    centerColor: string,
    borderColor: string,
    ringBgColor: string,
    alpha = 1,
  ) {
    const {
      dimens: { nodeRadius: ringRadius, nodeCore: coreRadius },
      colors: { primary, ringBg },
    } = this.themeState;

    // Config
    this.ctx.strokeStyle = borderColor || primary;
    this.ctx.fillStyle = ringBgColor || ringBg;

    // clear circle
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.beginPath();
    this.ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalCompositeOperation = 'source-over';

    this.ctx.globalAlpha = Math.max(alpha, 0);
    // Draw outer circle.
    this.ctx.beginPath();
    this.ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    this.ctx.fill();

    if (this.autoHide && !colorHasAlpha(this.ctx.fillStyle)) {
      this.ctx.globalAlpha = 1 - this.ctx.globalAlpha;
      this.ctx.fillStyle = ringBg;
      this.ctx.beginPath();
      this.ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw inner circle
    this.ctx.fillStyle = centerColor || primary;
    this.ctx.globalAlpha = alpha > 0.25 ? 1 : Math.max(alpha + 0.75, 0);
    this.ctx.beginPath();
    this.ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
    this.ctx.fill();

    if (this.autoHide && !colorHasAlpha(this.ctx.fillStyle)) {
      this.ctx.fillStyle = primary;
      this.ctx.globalAlpha = 1 - this.ctx.globalAlpha;
      this.ctx.beginPath();
      this.ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  joinNodes(
    col1: number,
    row1: number,
    col2: number,
    row2: number,
    isCoordinates = false,
    alpha = 1,
  ) {
    this.ctx.globalAlpha = Math.max(alpha, 0);
    const coords1 = this._getCoords(col1, row1);
    const coords2 = this._getCoords(col2, row2);

    let point1 = { x: coords1.x, y: coords1.y };
    let point2 = { x: coords2.x, y: coords2.y };

    if (isCoordinates) {
      point1 = { x: col1, y: row1 };
      point2 = { x: col2, y: row2 };
    }

    this.ctx.lineWidth = this.themeState.dimens.lineWidth;
    this.ctx.strokeStyle = this.themeState.colors.accent;
    this.ctx.lineCap = 'round';

    // Draw line
    this.ctx.beginPath();
    this.ctx.moveTo(point1.x, point1.y);
    this.ctx.lineTo(point2.x, point2.y);
    this.ctx.stroke();
    this.ctx.globalAlpha = 1;
  }

  drawSelected = (elapsedTime: number) => {
    const { colors: { accent, primary, selectedRingBg } } = this.themeState;
    const nodesCount = this.selectedNodes.length;

    const getAlpha = (pushedAt?: number) => (
      pushedAt
        ? 1 - ((elapsedTime - pushedAt) / this.autoHideTimeout)
        : 1);

    const drawNodes = () => {
      let lastPointCoords;

      for (let i = 0; i < nodesCount; i += 1) {
        const prev = this.selectedNodes[i - 1];
        const curr = this.selectedNodes[i];

        if (this.autoHide && !curr.pushedAt) {
          curr.pushedAt = elapsedTime;
        }

        const pointCoords = this._getCoords(curr.col, curr.row);
        const isLastNode = nodesCount - 1 === i;

        if (isLastNode) {
          lastPointCoords = pointCoords;
        }

        if (curr && prev) {
          const prevPointCoords = this._getCoords(prev.col, prev.row);
          const alpha = getAlpha(curr.pushedAt);

          if (!this.coordinates && isLastNode) {
            this.drawNode(
              pointCoords.x,
              pointCoords.y,
              accent,
              primary,
              selectedRingBg,
              alpha,
            );
          }

          this.drawNode(
            prevPointCoords.x,
            prevPointCoords.y,
            accent,
            primary,
            selectedRingBg,
            alpha,
          );
        }
      }

      if (lastPointCoords && this.coordinates) {
        this.drawNode(lastPointCoords.x, lastPointCoords.y, accent, primary, selectedRingBg);
      }
    };

    const drawLines = () => {
      let lastPointCoords;

      for (let i = 0; i < nodesCount; i += 1) {
        const prev = this.selectedNodes[i - 1];
        const curr = this.selectedNodes[i];

        const pointCoords = this._getCoords(curr.col, curr.row);
        const isLastNode = nodesCount - 1 === i;

        if (isLastNode) {
          lastPointCoords = pointCoords;
        }

        if (curr && prev) {
          const alpha = getAlpha(curr.pushedAt);

          this.joinNodes(prev.col, prev.row, curr.col, curr.row, false, alpha);
        }
      }

      if (lastPointCoords && this.coordinates) {
        // Draw a line between last node to the current drag position
        this.joinNodes(
          lastPointCoords.x,
          lastPointCoords.y,
          this.coordinates.x,
          this.coordinates.y,
          true,
        );
      }
    };

    drawNodes();
    // draw lines over nodes
    drawLines();
  };
}

export { PatternLock };
