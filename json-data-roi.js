#!/usr/bin/env node

const
  {
    PATHWAY_SAVE: envPathSave,
    TIMEZONE: envTimezone
  } = process.env;

const
  fs = require('fs'),
  path = require('path'),
  unirest = require('unirest');
const
  idsROI = [
    '121941', // be over 2025-06-01
    '119248', // be over 2025-05-18
    '117846', // be over 2025-04-09
    '117069', // be over 2025-03-20
    '116733', // be over 2025-05-08
    '116727', // be over 2025-03-11
    '115569', // be over 2025-02-01
    '113196', // be over 2025-06-01
    '110337', // be over 2024-12-16
    '110164'  // be over 2024-12-18
  ];

idsROI.forEach((id) => {
  const dateNow = new Date();
  // for you to change easily
  const
    petitionUrl = `https://www.roi.ru/api/petition/${id}.json`,
    pathToData = path.join(__dirname, (envPathSave ?? '/data'), id) + '.json';
  // read data, if needed
  let result, dataLog = [];
  
  // scrape data, possibly using prior data
  async function getData(url) {
    if (fs.existsSync(pathToData)) {
      dataLog = await JSON.parse(fs.readFileSync(pathToData));
    }

    try {
      const response = await unirest
        .get(url)
        .headers({
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        });
      const jsonResponse = await response.body?.data;
      /**
       * status.id === 31 - On vote
       * status.id === 71 - In archive
       */
      if (typeof jsonResponse !== 'undefined' && jsonResponse?.status.id === 31) {
        result = {
          dateStamp: dateToString(dateNow, (envTimezone ?? 'Etc/UTC')),
          consCount: jsonResponse?.vote.negative,
          prosCount: jsonResponse?.vote.affirmative,
          rapidsCount: jsonResponse?.vote.threshold,
          unixtimePoll: jsonResponse?.pool
        };
        console.log(`${url} ✅ Response done`);
      } else {
        console.log(`${url} 🚧 Response undefined`);
      }
      
    } catch (error) {
      error.message = `${error.message}`;
      throw error;
      
    } finally {
      await dataLog.push(result);

    }
  }
  
  // execute and persist data
  getData(petitionUrl) // no top level await... yet
    .then(() => {
      // persist data
      fs.writeFileSync(
        path.resolve(pathToData),
        JSON.stringify(dataLog, null, 2)
      );
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
