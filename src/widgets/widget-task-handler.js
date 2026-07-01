// src/widgets/widget-task-handler.js
// Registered in index.js. Runs in a separate headless JS context whenever
// Android needs to (re)draw the widget — same pattern as the SMS/notification
// headless tasks, but driven by the OS widget lifecycle instead of a
// BroadcastReceiver. Reads the last-synced summary from widgetSync's cache;
// it cannot reach React state directly.
import React from 'react';
import { BrokeStreakWidget } from './BrokeStreakWidget';
import { readWidgetCache } from '../services/widgetSync';

export async function widgetTaskHandler(props) {
  if (props.widgetAction === 'WIDGET_DELETED') return;

  const cache = await readWidgetCache();
  props.renderWidget(<BrokeStreakWidget {...cache} />);
}
