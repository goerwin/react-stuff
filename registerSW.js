if('serviceWorker' in navigator) {window.addEventListener('load', () => {navigator.serviceWorker.register('https://goerwin.github.io/react-finances/sw.js', { scope: 'https://goerwin.github.io/react-finances/' })})}