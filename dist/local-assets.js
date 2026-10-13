// Device-local presentation assets. No upload or backend storage is involved.
window.anansiAssets={
 async database(){return new Promise((resolve,reject)=>{const request=indexedDB.open('anansi-demo-assets',1);request.onupgradeneeded=()=>request.result.createObjectStore('files');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})},
 async put(key,file){const db=await this.database();try{await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(file,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{db.close()}return key},
 async get(key){if(!key)return null;const db=await this.database();try{return await new Promise((resolve,reject)=>{const request=db.transaction('files').objectStore('files').get(key);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error)})}finally{db.close()}}
};
