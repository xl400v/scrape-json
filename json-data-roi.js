#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const unirest = require('unirest');
const idsROI = '116733';

// for you to change easily
const dataFolder = '/data';
const now = new Date();
const pathToData = path.join(__dirname, dataFolder, idsROI) + '.json';

// read data, if needed
let data = [];
if (fs.existsSync(pathToData)) {
  data = JSON.parse(fs.readFileSync(pathToData));
}

// scrape data, possibly using prior data
async function getData() {
  const url = `https://www.roi.ru/api/petition/${idsROI}.json`;
  
  try {
    const response = await unirest.get(url)
      .headers({'Accept': 'application/json', 'Content-Type': 'application/json'});
    const jsonResponse = await response.body;
    const result = {
      dateStamp: dateToString(now),
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
getData() // no top level await... yet
  .then(() => {
    // persist data
    fs.writeFileSync(path.resolve(pathToData), JSON.stringify(data, null, 2));
  });

/**
 *
 * utils
 *
 */
function dateToString(ts) {
  const year = ts.getUTCFullYear();
  const month = (ts.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = ts.getUTCDate().toString().padStart(2, '0');
  const hour = ts.getUTCHours().toString().padStart(2, '0');
  const minut = ts.getUTCMinutes().toString().padStart(2, '0');
  const result = `${year}-${month}-${day} ${hour}:${minut}`;
  return result;
}
