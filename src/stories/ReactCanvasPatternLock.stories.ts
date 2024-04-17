import type { Meta, StoryObj } from '@storybook/react';

import { ReactCanvasPatternLock } from '../Component';

// More on how to set up stories at: https://storybook.js.org/docs/7.0/react/writing-stories/introduction
const meta: Meta<typeof ReactCanvasPatternLock> = {
  title: 'Example/ReactCanvasPatternLock',
  component: ReactCanvasPatternLock,
  tags: ['docsPage'],
  argTypes: {
    width: {
      control: {
        type: 'number',
      },
    },
    height: {
      control: {
        type: 'number',
      },
    },
    extraBounds: {
      control: {
        type: 'object',
      },
    },
    justifyNodes: {
      options: ['space-around', 'space-between'],
      control: {
        type: 'select',
      },
    },
    cols: {
      control: {
        type: 'number',
      },
    },
    rows: {
      control: {
        type: 'number',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ReactCanvasPatternLock>;

// More on writing stories with args: https://storybook.js.org/docs/7.0/react/writing-stories/args
export const General: Story = {
  args: {
    justifyNodes: 'space-around',
    hover: true,
  },
};
