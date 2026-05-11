const fs = require('fs');

// Convert photos to base64
const photos = {
  'liyanxiang': 'assets/liyanxiang.jpg',
  'wangxiaotao': 'assets/wangxiaotao.jpg',
  'yangxiaojun': 'assets/yangxiaojun.jpg'
};

const b64 = {};
for (const [name, file] of Object.entries(photos)) {
  const data = fs.readFileSync(file);
  b64[name] = 'data:image/jpeg;base64,' + data.toString('base64');
  console.log(name + ':', (b64[name].length / 1024).toFixed(0) + 'KB');
}

let html = fs.readFileSync('index.html', 'utf8');

// Replace image loading section
const oldLoad = /function loadImages\(\)\{[\s\S]*?loadImages\(\);/;
const newLoad = `function loadImages(){
  var b="data:image/jpeg;base64,";
  var imgs={
    '李彦祥':b+"${b64.liyanxiang.split(',')[1]}",
    '杨小军':b+"${b64.yangxiaojun.split(',')[1]}",
    '王小涛':b+"${b64.wangxiaotao.split(',')[1]}"
  };
  Object.keys(imgs).forEach(function(k){
    var img=new Image();
    img.onload=function(){imagesLoaded++;bossPhotos[k]=img};
    img.onerror=function(){imagesLoaded++};
    img.src=imgs[k];
  });
}
loadImages();`;

html = html.replace(oldLoad, newLoad);
fs.writeFileSync('index.html', html);
console.log('Photos embedded successfully');
