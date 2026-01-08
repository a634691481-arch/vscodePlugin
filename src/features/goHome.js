// ============================================================
// 下班提醒功能 - 增强版（带日期、星期、进度等信息）
// ============================================================
const vscode = require("vscode");

const GetOffMessage = "🏠 已经下班啦 赶紧滚回家去";
const NotificationMessage = "🎉 到点啦 该下班了!";

/** 获取配置 */
function getConfig() {
  const config = vscode.workspace.getConfiguration("gohome");
  return {
    prefix: config.get("prefix", ">>>>>"),
    hour: config.get("hour", 18),
    minute: config.get("minute", 0),
    showDate: config.get("showDate", true),
    showWeek: config.get("showWeek", true),
    showMonthProgress: config.get("showMonthProgress", true),
    showWorkday: config.get("showWorkday", true),
  };
}

/** 获取星期名称 */
function getWeekday(date) {
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return weekdays[date.getDay()];
}

/** 获取本月进度 */
function getMonthProgress(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const today = date.getDate();

  // 获取本月总天数
  const totalDays = new Date(year, month + 1, 0).getDate();
  const progress = ((today / totalDays) * 100).toFixed(0);

  return `${progress}%`;
}

/** 计算距离周末的工作日 */
function getDaysToWeekend(date) {
  const day = date.getDay();
  // 0 = 周日, 1 = 周一, ..., 6 = 周六

  if (day === 0) return "今天周日";
  if (day === 6) return "今天周六";

  const daysLeft = 6 - day; // 距离周六的天数
  return `距周末${daysLeft}天`;
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

  // 构建信息数组
  const infoParts = [];

  // 1. 前缀
  if (config.prefix) {
    infoParts.push(config.prefix);
  }

  // 2. 日期信息
  if (config.showDate) {
    const dateStr = `${now.getMonth() + 1}/${now.getDate()}`;
    infoParts.push(`📅 ${dateStr}`);
  }

  // 3. 星期信息
  if (config.showWeek) {
    const weekday = getWeekday(now);
    infoParts.push(`${weekday}`);
  }

  // 4. 本月进度
  if (config.showMonthProgress) {
    const progress = getMonthProgress(now);
    infoParts.push(`📊 ${progress}`);
  }

  // 5. 工作日计数
  if (config.showWorkday) {
    const workdayInfo = getDaysToWeekend(now);
    infoParts.push(`${workdayInfo}`);
  }

  // 6. 下班倒计时
  if (duration <= 0) {
    infoParts.push(GetOffMessage);
  } else {
    const hour = Math.floor(duration / 1000 / 60 / 60);
    const minute = Math.floor((duration / 1000 / 60) % 60);
    const second = Math.floor((duration / 1000) % 60);

    let timeStr = "⏰ 距离下班 ";
    if (hour) timeStr += `${hour}小时`;
    if (minute) timeStr += `${minute}分`;
    if (second && !hour) timeStr += `${second}秒`; // 只在1小时内显示秒

    infoParts.push(timeStr);
  }

  return infoParts.join(" | ");
}

/** 获取 Tooltip 详细信息 */
function getTooltip() {
  const config = getConfig();
  const now = new Date();
  const goHome = new Date();
  goHome.setHours(config.hour);
  goHome.setMinutes(config.minute);
  goHome.setSeconds(0);

  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const weekday = getWeekday(now);
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
  const offTime = `${config.hour.toString().padStart(2, "0")}:${config.minute
    .toString()
    .padStart(2, "0")}:00`;

  const totalDays = new Date(year, month, 0).getDate();
  const progress = getMonthProgress(now);
  const workdayInfo = getDaysToWeekend(now);

  return [
    `📆 完整日期：${year}年${month}月${date}日 ${weekday}`,
    `⏰ 当前时间：${currentTime}`,
    `🏠 下班时间：${offTime}`,
    `📊 本月进度：${progress} (已过${date}/${totalDays}天)`,
    `📅 ${workdayInfo}`,
  ].join("\n");
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
  myStatusBarItem.tooltip = getTooltip();
  myStatusBarItem.show();

  // 每秒更新
  const timer = setInterval(() => {
    const newMessage = getMessage();
    myStatusBarItem.text = newMessage;
    myStatusBarItem.tooltip = getTooltip();

    if (newMessage.includes(GetOffMessage)) {
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
