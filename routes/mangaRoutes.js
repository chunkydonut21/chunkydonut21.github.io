const express = require('express')
const router = express.Router()
const cheerio = require('cheerio')
const _ = require('lodash')
const request = require('request');
const CronJob = require('cron').CronJob
const path = require('path');
const fs = require('fs');
const cors = require('cors')

//all manga list
router.get('/api/all', cors(), (req, res) => {
	res.sendFile(path.join(__dirname, '..', 'all.json'));
});

//latest release manga list and recenty updated manga
router.get('/api/recent/:id', cors(), (req, res) => {
request(`https://fanfox.net/releases/${req.params.id}.htm`, (err, response, body) => {

  const $ = cheerio.load(body);
  
  const links = $('#updates .series_preview');

  let list = [];

  _.forEach(links, (elem) => {
    const name = $(elem).text();
    const link = $(elem).attr('href');
    const manga_id = $(elem).attr('rel');

    list.push({
      manga_id: manga_id,
      cover: 'https://a.fanfox.net/store/manga/'+ manga_id +'/cover.jpg?',
      name: name,
      link: link
    });

  });

  res.send({list});
});
});

//manga list based on popularity
router.get('/api/list/:id', cors(), (req, res) => {
request(`https://fanfox.net/directory/${req.params.id}.htm`, (err, response, body) => {

    const $ = cheerio.load(body);
    const links = $('.manga_text .title');
    const list = [];

    _.forEach(links, (elem) => {
      const name = $(elem).text();
      const link = $(elem).attr('href');
      const manga_id = $(elem).attr('rel');

      list.push({
          manga_id: manga_id,
          cover: 'https://a.fanfox.net/store/manga/'+ manga_id +'/cover.jpg?',
          name: name,
          link: link
      });
    });

    res.send(list);
});
});

//manga list based on category / year / alphabetical / status ( all can be done through single route )
router.get('/api/list/:order/:id', cors(), (req, res) => {
request(`https://fanfox.net/directory/${req.params.order}/${req.params.id}.htm`, (err, response, body) => {

    const $ = cheerio.load(body);
    const links = $('.manga_text .title');
    const list = [];

    _.forEach(links, (elem) => {
      const name = $(elem).text();
      const link = $(elem).attr('href');
      const manga_id = $(elem).attr('rel');

      list.push({
          manga_id: manga_id,
          cover: 'https://a.fanfox.net/store/manga/'+ manga_id +'/cover.jpg?',
          name: name,
          link: link
      });
    });

    res.send(list);
});
});

//individual manga Details
router.get('/api/show/:name', cors(), (req, res) => {
request(`https://fanfox.net/manga/${req.params.name}`, (err, response, body) => {

  const $ = cheerio.load(body);
  let json = {
      name : undefined,
      summary: undefined,
      cover: undefined,
      author: undefined,
      year: undefined,
      status: undefined,
      volumes: [],
      categories: []

  };

  $('#series_info').filter(() => {
      json.cover = $('.cover img').attr('src');
      json.status = $('.data span').text().split('\n')[1].trim();
  });

  $('#title').filter(() => {
      json.name = $('h1').text();
      json.summary  = $('.summary').text();
      const mangaInfo = $('td a');
      const info = [];
      _.forEach(mangaInfo, (elem) => {
        const s = $(elem).text();
        info.push(s);

      });

      const a = info.splice(0, 3);

      json.year = a[0];
      json.author = a[1];
      json.categories = info;

  });

  $('#chapters').filter(() => {
      const volume_elms = $('.volume');
      const chapter_elms = $('.chlist');

      for (let i = 0, l = volume_elms.length; i < l; ++i) {
        const elm = $(volume_elms[i]);
        const celm = $(chapter_elms[i]);

        const volume_name = elm.first().text();
        const volume_id = elm.first().text().replace('olume', '').replace('Chapter', '').replace(' ', '').substring(1,4).trim();

        const vlist = {
              id: volume_id,
              name: volume_name,
              chapters: []
          };

          for (let j = 0, ll = celm.children().length; j < ll; ++j) {
            const chapter = $(celm.children()[j]);

            const chapter_name = chapter.first().text().split('\n')[4].trim();
            const chapter_id = chapter_name.split(' ')[chapter_name.split(' ').length-1];
            const chapter_link = chapter.find('a.tips').attr('href');


              vlist.chapters.push({
                  id: chapter_id,
                  name: chapter_name,
                  link: chapter_link
              });
          }

          json.volumes.push(vlist);
        }
    });

    res.send(json);
});
});

//pages of single chapter of manga
router.get('/api/read/:name/:volume/:chapter/:id', cors(), (req, res) => {
const { name, volume, chapter, id } = req.params;
const url = `https://fanfox.net/manga/${name}/v${volume}/c${chapter}/${id}.html`;
request({ url: url, gzip: true }, (err, response, body) => {

    const $ = cheerio.load(body);
    let json = {
        id: undefined,
        name: undefined,
        title: undefined,
        image: undefined,
        totalPages: undefined,
        maxLength: undefined
    };

    $('#series').filter(() => {
        json.id = $('h1').text().split(' ')[$('h1').text().split(' ').length-1];
        json.name = $('h1').text();
        json.title = $('strong a').text();
        json.image = $('#viewer img').attr('src');
        
    });

    $('#top_bar').filter(() => {
      const mTotal = $('#top_bar select option');

      let total = [];
      let kt = [];
      _.forEach(mTotal, (elem) => {
        const s = $(elem).attr('value');
        if(s != 0) {
          const option = {
            key: parseInt(s),
            value: parseInt(s),
            text: s
          }
          kt.push(parseInt(s));
          total.push(option);
        }
      });

      json.totalPages = total;
      json.maxLength = kt;
    });
    res.send(json);
});
});

new CronJob('0 23 * * *', function() {
request('http://fanfox.net/manga/', (err, response, body) => {
  const $ = cheerio.load(body);
  const links = $('.series_preview');
  let list = [];

  _.forEach(links, (elem) => {
    const title = $(elem).text();
    const link = $(elem).attr('href');
    const manga_id = $(elem).attr('rel');

    list.push({
      title: title,
      link: link,
      manga_id: manga_id
    });
    
  });
  
  fs.writeFile('all.json', JSON.stringify(list, null, 4), () => {
      console.log('File successfully written!');
  });
  
});
}, null, true, 'Asia/Tokyo');


module.exports = router;