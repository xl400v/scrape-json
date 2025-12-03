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
    '142122', // be over 2026-11-01
    '141451', // be over 2026-10-22
    '141112', // be over 2026-10-11
    '137745', // be over 2026-12-04
    '137308', // be over 2026-09-26
    '137302', // be over 2026-09-26
    '136408', // be over 2026-09-09
    '135500', // be over 2026-06-17
    '135413', // be over 2026-08-26
    '135050', // be over 2026-06-17
    '134335', // be over 2026-07-31
    '134010', // be over 2026-05-22
    '133825', // be over 2026-05-17
    '133660', // be over 2026-05-14
    '132980', // be over 2026-04-30
    '131210', // be over 2026-04-17
    '128085', // be over 2026-05-21
    '128078', // be over 2026-01-23
    '126913', // be over 2025-12-21
    '126073', // be over 2026-02-05
    //'122513', // be over 2025-08-04
    //'121941', // be over 2025-05-25
    //'121038', // be over 2025-06-26
    //'120465', // be over 2025-06-14
    //'120159', // be over 2025-06-07
    //'119876', // be over 2025-05-29
    //'119248', // be over 2025-05-18
    //'117846', // be over 2025-04-09
    //'117707', // be over 2025-06-05
    //'117069', // be over 2025-03-20
    //'116733', // be over 2025-05-08
    //'116727', // be over 2025-03-11
    //'115569', // be over 2025-02-01
    //'113196', // be over 2025-06-01
    //'110337', // be over 2024-12-16
    //'110164', // be over 2024-12-18
    //'80612',  // be over 2022-02-28
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
      // Ref https://www.roi.ru/api/attributes/status.json
      const jsonResponse = await response.body?.data;

      // id == 31 - on vote
      if (jsonResponse?.status.id === 31) {
        result = await {
          //unixtimePoll: jsonResponse?.date.poll,
          dateStamp: dateToString(dateNow, (envTimezone ?? 'Etc/UTC')),
          consCount: jsonResponse?.vote.negative,
          prosCount: jsonResponse?.vote.affirmative,
          rapidsCount: jsonResponse?.vote.threshold
        };
        console.log(`${url} 🆗 Response OK`);
        // Ref https://www.roi.ru/api/petitions/poll.json

      // id == 51 - in review
      } else if (jsonResponse?.status.id === 51) {
        console.log(`${url} 🔜 Response OK, and vote under consideration`);
        // Ref https://www.roi.ru/api/petitions/advisement.json

      // id == 71 - in archive
      } else if (jsonResponse?.status.id === 71) {
        console.log(`${url} 🔚 Response OK, but vote closed`);
        // Ref https://www.roi.ru/api/petitions/archive.json

      } else {
        console.log(`${url} 🆖 Response NO Good`);
        // Ref https://www.roi.ru/api/petitions/complete.json
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
