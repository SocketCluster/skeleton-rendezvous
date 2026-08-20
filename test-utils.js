module.exports = {
  generateStringList: generateStringList,
  findKeySites: findKeySites,
  getDiffStats: getDiffStats,
  getMultiSiteKeyList: getMultiSiteKeyList,
  log: log
};

function generateStringList(baseString, count) {
  let items = [];
  for (let i = 0; i < count; i++) {
    items.push(baseString + i);
  }
  return items;
}

function getDistributionStats(countMap) {
  let minKeys = Infinity;
  let maxKeys = -Infinity;
  let diff;

  Object.keys(countMap).forEach((site) => {
    if (countMap[site] < minKeys) {
      minKeys = countMap[site];
    }
    if (countMap[site] > maxKeys) {
      maxKeys = countMap[site];
    }
  });
  diff = maxKeys / minKeys;

  return {
    min: minKeys,
    max: maxKeys,
    diff: diff
  };
}

function findKeySites(srh, keys) {
  let hashCount = 0;
  let realHashFn = srh.hash;

  srh.hash = function () {
    hashCount++;
    return realHashFn.apply(this, arguments);
  };

  let siteMap = {};
  let results = [];

  let start = Date.now();
  keys.forEach((key) => {
    let targetSite = srh.findSite(key);

    results.push(targetSite);
    if (!siteMap[targetSite]) {
      siteMap[targetSite] = [];
    }
    siteMap[targetSite].push(key);
  });
  let end = Date.now();

  let siteCountMap = {};
  srh.getSites().forEach((site) => {
    if (siteMap[site]) {
      siteCountMap[site] = siteMap[site].length;
    } else {
      siteCountMap[site] = 0;
    }
  });

  let stats = getDistributionStats(siteCountMap);
  stats.startTime = start;
  stats.endTime = end;
  stats.duration = end - start;

  return {
    map: siteMap,
    list: results,
    countMap: siteCountMap,
    hashCount: hashCount,
    stats: stats
  };
}

function getDiffStats(resultA, resultB) {
  let siteMapA = resultA.map;
  let siteMapB = resultB.map;

  let keyToSiteMapA = {};
  Object.keys(siteMapA).forEach((site) => {
    let keyList = siteMapA[site] || [];
    keyList.forEach((key) => {
      keyToSiteMapA[key] = site;
    });
  });

  let keyToSiteMapB = {};
  Object.keys(siteMapB).forEach((site) => {
    let keyList = siteMapB[site] || [];
    keyList.forEach((key) => {
      keyToSiteMapB[key] = site;
    });
  });

  let keyLookup = {};
  let diffKeyLookup = {};

  Object.keys(keyToSiteMapA).forEach((key) => {
    let siteA = keyToSiteMapA[key];
    let siteB = keyToSiteMapB[key];
    if (siteA !== siteB) {
      diffKeyLookup[key] = true;
    }
    keyLookup[key] = true;
  });

  Object.keys(keyToSiteMapB).forEach((key) => {
    let siteA = keyToSiteMapA[key];
    let siteB = keyToSiteMapB[key];
    if (siteA !== siteB) {
      diffKeyLookup[key] = true;
    }
    keyLookup[key] = true;
  });

  return {
    keyList: Object.keys(keyLookup),
    diffKeyList: Object.keys(diffKeyLookup)
  };
}

// Returns the keys which more than one site lays claim to. Each key is looked
// up several times so that a lookup which does not always land on the same site
// shows up as two sites owning the same key.
function getMultiSiteKeyList(srh, keys, lookupCount) {
  lookupCount = lookupCount || 3;

  let keyToSiteLookup = {};
  keys.forEach((key) => {
    keyToSiteLookup[key] = {};
  });

  for (let i = 0; i < lookupCount; i++) {
    keys.forEach((key) => {
      keyToSiteLookup[key][srh.findSite(key)] = true;
    });
  }

  return keys.filter((key) => {
    return Object.keys(keyToSiteLookup[key]).length !== 1;
  });
}

function log() {
  console.log('        \u001b[2m' + Array.prototype.join.call(arguments, ' ') + '\u001b[22m');
}
