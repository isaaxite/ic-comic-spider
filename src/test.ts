import * as fs from 'fs';
import Kukudm from "./lib/parser/kukudm";
import Chuixue from './lib/parser/chuixue';
import * as iconv from 'iconv-lite';

(async () => {
  // const parser = new Kukudm();
  // const imgStream = await parser.downloadPic('temp', {
  //   isLast: true,
  //   referer: 'http://m.kukudm.com/comiclist/2039/69025/21.htm',
  //   next:
  //    'http://n8.1whour.com/newkuku/2019/01/30/%E7%81%AB%E9%B3%B3%E7%87%8E%E5%8E%9F%5D%5B%E7%AC%AC514%E8%A9%B1/00125L.jpg',
  //   url:
  //    'http://n8.1whour.com/newkuku/2019/01/30/%E7%81%AB%E9%B3%B3%E7%87%8E%E5%8E%9F%5D%5B%E7%AC%AC514%E8%A9%B1/02103P.jpg',
  //   prefix:
  //    'http://n8.1whour.com/newkuku/2019/01/30/%E7%81%AB%E9%B3%B3%E7%87%8E%E5%8E%9F%5D%5B%E7%AC%AC514%E8%A9%B1/',
  //   content: '02103P.jpg',
  //   name: '02103P',
  //   format: 'jpg',
  //   index: 2103
  // });
  // imgStream && imgStream.pipe(fs.createWriteStream('./temp.jpg'));

  // const temp = await parser.chapterPage('http://m.kukudm.com/comiclist/2039/69025/21.htm', {});
  // console.log(temp);

  // const temp = await parser.search('你');
  // console.log(temp);

  // const temp = await parser.catalog('http://m.kukudm.com/comiclist/2039/');
  // console.log(temp);

  // var boby = 'name=chenziang&password=a123456';
  // var str =JSON.stringify(boby);//req.boby
  // console.log(str);
  // var decodedstr =new Buffer(str).toString('base64');
  // console.log("转base64 "+decodedstr);
  // var obj =new Buffer(decodedstr,'base64').toString();
  // console.log(obj);

  // const photosr: string[] = [];
  // const temp = Buffer.from(`ZXZhbChmdW5jdGlvbihwLGEsYyxrLGUsZCl7ZT1mdW5jdGlvbihjKXtyZXR1cm4oYzxhPycnOmUocGFyc2VJbnQoYy9hKSkpKygoYz1jJWEpPjM1P1N0cmluZy5mcm9tQ2hhckNvZGUoYysyOSk6Yy50b1N0cmluZygzNikpfTtpZighJycucmVwbGFjZSgvXi8sU3RyaW5nKSl7d2hpbGUoYy0tKXtkW2UoYyldPWtbY118fGUoYyl9az1bZnVuY3Rpb24oZSl7cmV0dXJuIGRbZV19XTtlPWZ1bmN0aW9uKCl7cmV0dXJuJ1xcdysnfTtjPTF9O3doaWxlKGMtLSl7aWYoa1tjXSl7cD1wLnJlcGxhY2UobmV3IFJlZ0V4cCgnXFxiJytlKGMpKydcXGInLCdnJyksa1tjXSl9fXJldHVybiBwfSgnYlsxXT0iYy8wLzAvMTcvRy5hIjtiWzJdPSJjLzAvMC8xNy9ILmEiO2JbM109ImMvMC8wLzE3L0kuYSI7Yls0XT0iYy8wLzAvMTcvSi5hIjtiWzVdPSJjLzAvMC8xNy9GLmEiO2JbNl09ImMvMC8wLzE3L0UuYSI7Yls3XT0iYy8wLzAvMTcvQS5hIjtiWzhdPSJjLzAvMC8xNy9CLmEiO2JbOV09ImMvMC8wLzE3L0MuYSI7YlsxMF09ImMvMC8wLzE3L0QuYSI7YlsxMV09ImMvMC8wLzE3L0suYSI7YlsxMl09ImMvMC8wLzE3L0wuYSI7YlsxM109ImMvMC8wLzE3L1MuYSI7YlsxNF09ImMvMC8wLzE3L1QuYSI7YlsxNV09ImMvMC8wLzE3L1UuYSI7YlsxNl09ImMvMC8wLzE3L1IuYSI7YlsxN109ImMvMC8wLzE3L1EuYSI7YlsxOF09ImMvMC8wLzE3L00uYSI7YlsxOV09ImMvMC8wLzE3L04uYSI7YltPXT0iYy8wLzAvMTcvei5hIjtiW1ZdPSJjLzAvMC8xNy93LmEiO2Jbal09ImMvMC8wLzE3L2suYSI7YltsXT0iYy8wLzAvMTcvaS5hIjtiW25dPSJjLzAvMC8xNy9kLmEiO2JbZV09ImMvMC8wLzE3L2cuYSI7YltoXT0iYy8wLzAvMTcvZi5hIjtiW21dPSJjLzAvMC8xNy95LmEiO2Jbdl09ImMvMC8wLzE3L28uYSI7Ylt4XT0iYy8wLzAvMTcvdS5hIjtiW1ddPSJjLzAvMC8xNy90LmEiO2JbcF09ImMvMC8wLzE3L3EuYSI7YltyXT0iYy8wLzAvMTcvcy5hIjtiW1BdPSJjLzAvMC8xNy8xYi5hIjtiWzFQXT0iYy8wLzAvMTcvMXUuYSI7YlsxQ109ImMvMC8wLzE3LzFGLmEiO2JbMXhdPSJjLzAvMC8xNy8xTi5hIjtiWzF6XT0iYy8wLzAvMTcvMUIuYSI7YlsxRF09ImMvMC8wLzE3LzFBLmEiO2JbMXZdPSJjLzAvMC8xNy8xdy5hIjtiWzF5XT0iYy8wLzAvMTcvMUcuYSI7YlsxTV09ImMvMC8wLzE3LzFPLmEiO2JbMUxdPSJjLzAvMC8xNy8xSy5hIjtiWzFIXT0iYy8wLzAvMTcvMUkuYSI7YlsxSl09ImMvMC8wLzE3LzFFLmEiO2JbMXNdPSJjLzAvMC8xNy8xZC5hIjtiWzFlXT0iYy8wLzAvMTcvMWYuYSI7YlsxZ109ImMvMC8wLzE3LzFjLmEiO2JbMXRdPSJjLzAvMC8xNy9YLmEiO2JbWV09ImMvMC8wLzE3L1ouYSI7YlsxYV09ImMvMC8wLzE3LzFoLmEiO2JbMWldPSJjLzAvMC8xNy8xcC5hIjtiWzFxXT0iYy8wLzAvMTcvMXIuYSI7Ylsxb109ImMvMC8wLzE3LzFuLmEiO2JbMWpdPSJjLzAvMC8xNy8xay5hIjtiWzFsXT0iYy8wLzAvMTcvMW0uYSI7Jyw2MiwxMTQsJzA2fHx8fHx8fHx8fGpwZ3xwaG90b3NyfDIwMTh8NTcxZjljNmI3N3wyNXw1NzUyNWMxNjRlfDU3MDhkMzY1Zjl8MjZ8NTc2YzM0ZGI3MnwyMnw1N2I4YmVlODcyfDIzfDI3fDI0fDU3ZDExNTFlZjh8MzF8NTdmOTY0YTJmMnwzMnw1N2RkMmI1YWNjfDU3ODhkODRhNzd8NTcwNTg0ZWYxZHwyOHw1NzgyZDkzNGQ5fDI5fDU3MWYwYzc3OWF8NTc5MWE1NjkzOHw1Nzc1NzNlN2U5fDU3MTY0NmQ0Yjl8NTcyNzhkNjFlYnw1NzJjZTc2ODUwfDU3MWRiODk0Nzh8NTc4OGNiY2VmMXw1NzEzZjkyMjMyfDU3OWVlOTEzMDh8NTdkYTJjNjM3NHw1N2Q0ODkxZjczfDU3ZmFkNDM1OGZ8NTcyNmUxOTVmZXw1NzFiMjM1OWEyfDU3MmJlOWY0MTJ8MjB8MzN8NTc2OTZiNTMwYnw1NzdjMGQ4MmM5fDU3ZjRhYzBlNjZ8NTdjNjA2YTYyNnw1NzgwMjg4NGZlfDIxfDMwfDU3MDg4ZGRhYTF8NDl8NTc2MmEwZDg0ZHx8fHx8fHx8fHx8NTB8NTdjYzM2NmUzMHw1NzNlMWQ5NWJifDU3YzFkNzU2YmJ8NDZ8NTdlYzZkZjhjMnw0N3w1N2IxNTY1MzRmfDUxfDU0fDU3OWVlOWIyNzZ8NTV8NTdjYWRkZDZjMnw1NzViNjg3NTlifDUzfDU3YzBlYTEyOWF8NTJ8NTcxZWYzMzE2MXw0NXw0OHw1NzdiZTEwNzU3fDM5fDU3YzMyNDZiODR8MzZ8NDB8Mzd8NTdmYjkyMTQwMnw1NzQ2MWM3Y2IxfDM1fDM4fDU3MTA2ZjZhMTl8NTcwMjNhNDk5Y3w1NzZhNWI0ZjMyfDQzfDU3OWNmNWNkOTJ8NDR8NTdiMGI0NjQxOXw0Mnw0MXw1Nzk4ODUwMzdjfDU3YzZlNWJiZWN8MzQnLnNwbGl0KCd8JyksMCx7fSkpCg==`, 'base64').toString();
  // eval(eval(temp.slice(4)));
  // console.log(photosr);

  // const parser = new Chuixue();
  // // const temp = await parser.catalog('http://www.chuixue.net/manhua/30389/');
  // let temp = await parser.chapterPage('http://www.chuixue.net/manhua/1110/528831.html', {
  //   pageNo: 17,
  //   chapterName: 'temp'
  // });
  // console.log(temp);

  const parser = new Kukudm();
  const temp = await parser.chapterPage('http://comic.kukudm.com/comiclist/65/766/1.htm', {
    chapterName: 'temp'
  });
  console.log(temp);
})();
