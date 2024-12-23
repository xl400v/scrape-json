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
    '126913', // be over 2025-12-25
    '121941', // be over 2025-06-01
    '121038', // be over 2025-06-26
    '120465', // be over 2025-06-14
    '119876', // be over 2025-05-29
    '119248', // be over 2025-05-18
    '117846', // be over 2025-04-09
    '117707', // be over 2025-06-05
    '117069', // be over 2025-03-20
    '116733', // be over 2025-05-08
    '116727', // be over 2025-03-11
    '115569', // be over 2025-02-01
    '113196', // be over 2025-06-01
    '110337', // be over 2024-12-16
    '110164', // be over 2024-12-18
    '80612'   // be over 2022-02-28
  ];

idsROI.forEach((id) => {
  // for you to change easily
  const
    dateNow = new Date(),
    petitionUrl = `https://www.roi.ru/api/petition/${id}.json`,
    pathToData = path.join(__dirname, (envPathSave ?? '/data/roi'), id) + '.json';
  // read data, if needed
  let result = null, dataLog = [];
  
  // scrape data, possibly using prior data
  async function getData(url) {
    if (fs.existsSync(pathToData)) {
      dataLog = JSON.parse(fs.readFileSync(pathToData));
    }

    try {
      const response = await unirest
        .get(url)
        .headers({
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        });
      const jsonResponse = await response.body?.data;
      
      if (jsonResponse?.status.id === 31) { // id == 31 - on vote
        result = await {
          //unixtimePoll: jsonResponse?.date.poll,
          dateStamp: dateToString(dateNow, (envTimezone ?? 'Etc/UTC')),
          consCount: jsonResponse?.vote.negative,
          prosCount: jsonResponse?.vote.affirmative,
          rapidsCount: jsonResponse?.vote.threshold
        };
        console.log(`${url} ✅ Response done`);
      } else if (jsonResponse?.status.id === 71) { // id == 71 - in archive
        console.log(`${url} ❎ Response done, but vote closed`);
      } else {
        console.log(`${url} 🚧 Response undefined`);
      }
      
    } catch (error) {
      error.message = `${error.message}`;
      throw error;
      
    } finally {
      dataLog.push(result);

    }
  }
  
  // execute and persist data
  getData(petitionUrl) // no top level await... yet
    .then(() => {
      if (result !== null) {
        // persist data
        fs.writeFileSync(
          path.resolve(pathToData),
          JSON.stringify(dataLog, null, 2)
        );
      }
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
