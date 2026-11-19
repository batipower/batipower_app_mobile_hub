/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'notification-content',
  // 16.0 : `ViewThatFits` (cartes qui s'empilent sur petit écran). L'app elle-même demande iOS 16.4.
  deploymentTarget: '16.0',
  frameworks: ['SwiftUI', 'UserNotifications', 'UserNotificationsUI'],
  images: {
    hubLogo: '../../assets/logo-batipower.png',
  },
};
