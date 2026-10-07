const help=document.getElementById('install-help');
const button=document.getElementById('install-app');
let promptEvent;
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone;
function updateConnection(){document.getElementById('connection-status').textContent=navigator.onLine?'':'オフラインです。学習履歴は保存できますが、原本PDFを見るには通信が必要です。';}
updateConnection();addEventListener('online',updateConnection);addEventListener('offline',updateConnection);
if(standalone())help.textContent='ホーム画面から起動しています。原本PDFの閲覧には通信が必要です。';
addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e;if(!standalone())button.hidden=false;});
button.onclick=async()=>{if(!promptEvent)return;await promptEvent.prompt();await promptEvent.userChoice;promptEvent=null;button.hidden=true;};
addEventListener('appinstalled',()=>{button.hidden=true;help.textContent='ホーム画面に追加しました。';});
if('serviceWorker' in navigator && isSecureContext){
  navigator.serviceWorker.register('./sw.js').catch(()=>{document.getElementById('connection-status').textContent='オフライン起動の準備ができませんでした。通信中は引き続き利用できます。';});
}
