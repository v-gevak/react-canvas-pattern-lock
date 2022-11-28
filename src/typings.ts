export type TNodes = Array<{ row: number; col: number }>;

export type TGrid = [number, number];

export type OnCompleteCallback = (nodes: TNodes) => void;

export type ThemeParams = {
    /**
     * Цвета.
     */
    colors: {
        /**
         * Цвет линии.
         */
        accent: string;

        /**
         * Основной цвет узла и линии.
         */
        primary: string;

        /**
         * Цвет канваса.
         */
        bg: string;

        /**
         * Внешний цвет заливки узла.
         */
        ringBg: string;

        /**
         * Внешний цвет заливки выбранного узла.
         */
        selectedRingBg: string;
    };

    /**
     * Размеры.
     */
    dimens: {
        /**
         * Радиус внешнего кольца узла.
         */
        nodeRadius: number;

        /**
         * Толщина линии, соединяющей узлы.
         */
        lineWidth: number;

        /**
         * Радиус внутренней окружности узла.
         */
        nodeCore: number;

        /**
         * Толщина внешней линии узла.
         */
        nodeRing: number;
    };
}

export type Theme = Record<string, ThemeParams>;

export type TPatternLockInstance = {
    destroy: () => void;

    /**
     * Подписаться на событие завершения ввода.
     */
    onComplete: (fn: OnCompleteCallback) => void;

    /**
     * Подписаться на событие начала ввода кода.
     */
    onStart: (fn: () => void) => void;

    /**
     * Функция изменения темы.
     */
    setThemeState: (themeName: string) => void;

    /**
     * Установить состояние по умолчанию.
     */
    setInitialState: () => void;
};

export type TProps = {
    /**
     * Метод выравнивания узлов.
     * @default space-available
     */
    justifyNodes?: 'space-around' | 'space-between';

    /**
     * Ширина в пикселях.
     * @defaut 315
     */
    width?: number;

    /**
     * Высота в пикселях.
     * @defaut 315
     */
    height?: number;

    /**
     * Количество столбцов.
     * @default 3
     */
    rows?: number;

    /**
     * Количество строк.
     * @default 3
     */
    cols?: number;

    /**
     * Коллбек, вызываемый после завершения ввода кода.
     */
    onComplete?: (code: number[], nodes: TNodes) => void;

    /**
     * Коллбек, вызываемый при начале ввода кода.
     */
    onDragStart?: () => void;

    /**
     * Состояние темы.
     */
    themeState?: string;

    /**
     * Тема.
     */
    theme?: Theme;
};

export type TPatternLockOptions = {
    $canvas: HTMLCanvasElement;
    width: number;
    height:number;
    grid: [number, number],
    theme: Theme;
    themeState: string;
    justifyNodes: 'space-around' | 'space-between'
};
