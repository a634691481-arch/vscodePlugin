// ============================================================
// 下班提醒功能
// ============================================================
const vscode = require("vscode");

const GetOffMessage = "🏠 已经下班啦 赶紧滚回家去";
const NotificationMessage = "🎉 到点啦 该下班了!";

/** 获取配置 */
function getConfig() {
  const config = vscode.workspace.getConfiguration("gohome");
  return {
    hour: config.get("hour", 18),
    minute: config.get("minute", 0),
  };
}

/** 获取提示消息 */
function getMessage() {
  const config = getConfig();
  const now = new Date();
  const goHome = new Date();
  goHome.setHours(config.hour);
  goHome.setMinutes(config.minute);
  goHome.setSeconds(0);

  const duration = goHome.getTime() - now.getTime();

  if (duration <= 0) {
    return GetOffMessage;
  }

  const hour = Math.floor(duration / 1000 / 60 / 60);
  const minute = Math.floor((duration / 1000 / 60) % 60);
  const second = Math.floor((duration / 1000) % 60);

  let timeStr = ">> 距离下班还有 ";
  if (hour) timeStr += `${hour}小时`;
  if (minute) timeStr += `${minute}分钟`;
  if (second) timeStr += `${second}秒`;

  return timeStr;
}

/** 是否已经提醒过下班 */
let isGetOff = false;

/** 注册下班提醒功能 */
function registerGoHome() {
  const myStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    0
  );
  myStatusBarItem.text = getMessage();
  myStatusBarItem.tooltip = "下班倒计时";
  myStatusBarItem.show();

  // 每秒更新
  const timer = setInterval(() => {
    const newMessage = getMessage();
    myStatusBarItem.text = newMessage;

    if (newMessage === GetOffMessage) {
      if (!isGetOff) {
        vscode.window.showInformationMessage(NotificationMessage);
        isGetOff = true;
      }
    } else {
      isGetOff = false;
    }
  }, 1000);

  // 返回 disposable
  return {
    dispose: () => {
      clearInterval(timer);
      myStatusBarItem.dispose();
    },
  };
}

module.exports = { registerGoHome };
