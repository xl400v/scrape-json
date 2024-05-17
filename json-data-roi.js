#!/usr/bin/env node

const
  envTimezone = process.env.TIMEZONE || 'Etc/UTC',
  envPathSave = process.env.PATHWAY_SAVE || '/data';
const
  fs = require('fs'),
  path = require('path'),
  unirest = require('unirest');
const
  idsROI = [
    '119248',
    '116733'
  ];

idsROI.forEach(async (id) => {
  const dateNow = new Date();
  // for you to change easily
  const petitionUrl = `https://www.roi.ru/api/petition/${id}.json`;
  const pathToData = path.join(__dirname, envPathSave, id) + '.json';
  
  // read data, if needed
  let data = [];
  if (fs.existsSync(pathToData)) {
    data = JSON.parse(fs.readFileSync(pathToData));
  }
  
  // scrape data, possibly using prior data
  async function getData(url) {
    try {
      const response = await unirest
        .get(url)
        .headers({
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        });
      const jsonResponse = await response.body;
      const result = {
        dateStamp: dateToString(dateNow, envTimezone),
        consCount: jsonResponse.data?.vote.negative,
        prosCount: jsonResponse.data?.vote.affirmative,
        rapidsCount: jsonResponse.data?.vote.threshold,
        unixtimePoll: jsonResponse.data?.pool
      };
      
      /**
       * status.id === 31 - On vote
       * status.id === 71 - In archive
       */
      if (jsonResponse.data?.status.id === 31) {
        console.log('✅ success', jsonResponse.data);
        
        data.push(result);
      } else {
        console.log('❌ failure', jsonResponse.data);
      }
      
    } catch(error) {
      console.error(error);
    }
  }
  
  // execute and persist data
  getData(petitionUrl) // no top level await... yet
    .then(() => {
      // persist data
      fs.writeFileSync(path.resolve(pathToData), JSON.stringify(data, null, 2));
    });
});

/**
 *
 * utils
 *
 */
function dateToString(ts, tz) {
  const utcDate = new Date(ts.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(ts.toLocaleString('en-US', { timeZone: tz }));
  const offset = utcDate.getTime() - tzDate.getTime();
  ts.setTime(ts.getTime() - offset);
  
  const year = ts.getUTCFullYear();
  const month = (ts.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = ts.getUTCDate().toString().padStart(2, '0');
  const hour = ts.getUTCHours().toString().padStart(2, '0');
  const minut = ts.getUTCMinutes().toString().padStart(2, '0');
  const local = `${year}-${month}-${day} ${hour}:${minut}`;
  return local;
}
