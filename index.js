let crypto = require('crypto');

function SkeletonRendezvousHasher(options) {
  options = options || {};
  if (options.fanout > 9) {
    throw new Error('The fanout option cannot be higher than 9');
  }
  if (options.fanout < 2) {
    throw new Error('The fanout option cannot be less than 2');
  }
  this.fanout = options.fanout || 2;
  this.hashAlgorithm = options.hashAlgorithm || 'md5';
  this.targetClusterSize = options.targetClusterSize || 16;
  let hexHashLength = this.hash('').length;
  this._unitIntervalHexDigits = Math.min(13, hexHashLength);
  this._unitIntervalUpperBound = Math.pow(16, this._unitIntervalHexDigits) + 1;

  this._virtualGroupHexDigits = Math.min(13, Math.floor(hexHashLength / this.fanout));
  if (this._virtualGroupHexDigits < 4) {
    this._virtualGroupHexDigits = 0;
  }
  this._virtualGroupUpperBound = Math.pow(16, this._virtualGroupHexDigits) + 1;
  this.sites = [];
  this.clusters = [];
  this._generateClusters(options.sites ? [].concat(options.sites) : []);
};

SkeletonRendezvousHasher.prototype._logx = function (value, fanout) {
  return Math.log(value) / Math.log(fanout);
};

SkeletonRendezvousHasher.prototype.hash = function (key) {
  let hasher = crypto.createHash(this.hashAlgorithm);
  hasher.update(key);
  return hasher.digest('hex');
};

SkeletonRendezvousHasher.prototype._hashToUnitInterval = function (item) {
  // 13 hex digits is 52 bits, which is the most that fits exactly in a double.
  let intHash = parseInt(this.hash(item).substr(0, this._unitIntervalHexDigits), 16);
  return (intHash + 1) / this._unitIntervalUpperBound;
};

SkeletonRendezvousHasher.prototype._readVirtualGroupUnitHash = function (levelHash, virtualGroup) {
  let hexDigits = this._virtualGroupHexDigits;
  let intHash = parseInt(levelHash.substr(virtualGroup * hexDigits, hexDigits), 16);
  return (intHash + 1) / this._virtualGroupUpperBound;
};

// The chance of a candidate producing the highest score is proportional to its
// weight, and changing one weight only disturbs a proportional share of the
// items which were passing through it.
SkeletonRendezvousHasher.prototype._getWeightedScore = function (unitHash, weight) {
  return -weight / Math.log(unitHash);
};

SkeletonRendezvousHasher.prototype.getSites = function () {
  return this.sites.slice();
};

// The branch depends only on the site's own name, so adding or removing a site
// never changes the branch taken by any other site.
SkeletonRendezvousHasher.prototype._findSiteVirtualGroup = function (site, level) {
  let levelPrefix = 'site:' + site + ':' + level;
  let levelHash = this._virtualGroupHexDigits ? this.hash(levelPrefix) : null;
  let hexDigits = this._virtualGroupHexDigits;
  let highestHash = null;
  let targetVirtualGroup = 0;

  for (let j = 0; j < this.fanout; j++) {
    let currentHash = levelHash === null ?
      this.hash(levelPrefix + ':' + j) :
      levelHash.substr(j * hexDigits, hexDigits);
    if (highestHash == null || currentHash > highestHash) {
      highestHash = currentHash;
      targetVirtualGroup = j;
    }
  }
  return targetVirtualGroup;
};

// The depth is decided per branch rather than globally, so a branch which grows
// past targetClusterSize splits without disturbing any of the others.
SkeletonRendezvousHasher.prototype._partitionSites = function (siteList, path) {
  this.virtualGroupWeights[path] = siteList.length;
  if (!siteList.length) {
    return;
  }

  if (siteList.length <= this.targetClusterSize * this.fanout || path.length >= this._maxVirtualLevelCount) {
    this._clusterIndexLookup[path] = this.clusters.length;
    this.clusters.push(siteList);
    if (path.length > this.virtualLevelCount) {
      this.virtualLevelCount = path.length;
    }
    return;
  }

  let virtualGroups = [];
  for (let j = 0; j < this.fanout; j++) {
    virtualGroups[j] = [];
  }
  let level = path.length;
  siteList.forEach((site) => {
    virtualGroups[this._findSiteVirtualGroup(site, level)].push(site);
  });
  for (let j = 0; j < this.fanout; j++) {
    this._partitionSites(virtualGroups[j], path + j);
  }
};

SkeletonRendezvousHasher.prototype._generateClusters = function (sites) {
  let siteLookup = {};
  // Remove duplicates.
  sites = sites.filter((site) => {
    if (!siteLookup[site]) {
      siteLookup[site] = true;
      return true;
    }
    return false;
  });
  sites.sort();
  this.sites = sites;

  this.clusters = [];
  // Records how many sites sit underneath each node of the skeleton. Cluster
  // sizes vary because membership is decided by hashing, so findSite uses these
  // counts to hand each cluster a matching share of the keys.
  this.virtualGroupWeights = {};
  this._clusterIndexLookup = {};
  this.virtualLevelCount = 0;
  // Only a backstop against pathological hash collisions - the partitioning
  // stops as soon as a group fits inside targetClusterSize.
  this._maxVirtualLevelCount = Math.max(1, Math.ceil(this._logx(Math.max(sites.length, 2), this.fanout)) + 12);

  this._partitionSites(sites, '');
  this.clusterCount = this.clusters.length;
};

// Time complexity O(n log n)
// where n is the total number of sites.
SkeletonRendezvousHasher.prototype.setSites = function (sitesToSet) {
  let sites = [].concat(sitesToSet);
  this._generateClusters(sites);
};

// Time complexity O(n log n)
// where n is the total number of sites.
SkeletonRendezvousHasher.prototype.addSites = function (sitesToAdd) {
  let sites = this.getSites().concat(sitesToAdd);
  this._generateClusters(sites);
};

// Time complexity O(n log n)
// where n is the total number of sites.
SkeletonRendezvousHasher.prototype.removeSites = function (sitesToRemove) {
  if (!Array.isArray(sitesToRemove)) {
    sitesToRemove = [sitesToRemove];
  }
  let removeSiteLookup = {};
  sitesToRemove.forEach((site) => {
    removeSiteLookup[site] = true;
  });
  let sites = this.getSites().filter((site) => {
    return !removeSiteLookup[site];
  });
  this._generateClusters(sites);
};

// Time complexity: O(log n)
// where n is the total number of sites.
SkeletonRendezvousHasher.prototype.findSite = function (key, salt) {
  let saltString;
  if (salt) {
    saltString = salt.toString();
  } else {
    salt = 0;
    saltString = '';
  }
  let path = '';
  let keyPrefix = 'key:' + key + ':' + saltString + ':';
  let targetClusterIndex = this._clusterIndexLookup[path];

  while (targetClusterIndex === undefined) {
    let highestScore = null;
    let targetVirtualGroup = -1;
    let levelPrefix = keyPrefix + path.length;
    let levelHash = this._virtualGroupHexDigits ? this.hash(levelPrefix) : null;

    for (let j = 0; j < this.fanout; j++) {
      let siteCount = this.virtualGroupWeights[path + j] || 0;
      // An empty branch can never win, so the walk cannot dead-end on a
      // cluster with no sites in it.
      if (siteCount === 0) {
        continue;
      }
      let unitHash = levelHash === null ?
        this._hashToUnitInterval(levelPrefix + ':' + j) :
        this._readVirtualGroupUnitHash(levelHash, j);
      // Weighting by site count keeps keys per site even despite uneven
      // cluster sizes.
      let currentScore = this._getWeightedScore(unitHash, siteCount);
      if (highestScore == null || currentScore > highestScore) {
        highestScore = currentScore;
        targetVirtualGroup = j;
      }
    }
    if (targetVirtualGroup < 0) {
      // No available target.
      return null;
    }
    path += targetVirtualGroup.toString();
    targetClusterIndex = this._clusterIndexLookup[path];
  }

  let targetCluster = this.clusters[targetClusterIndex];
  // The path is deliberately left out of the rendezvous input - it keeps the
  // winner the same when clusters merge or split, so a resize only moves the
  // keys which genuinely have to move.
  let keyIndexWithinCluster = this._findIndexWithHighestRandomWeight(key + salt, targetCluster);
  let targetSite = targetCluster[keyIndexWithinCluster];
  if (targetSite == null) {
    return null;
  }
  return targetSite;
};

SkeletonRendezvousHasher.prototype._findIndexWithHighestRandomWeight = function (item, list) {
  let targetIndex = 0;
  let highestHash = null;

  (list || []).forEach((candidate, index) => {
    let currentHash = this.hash(item + candidate);
    if (!highestHash || currentHash > highestHash) {
      highestHash = currentHash;
      targetIndex = index;
    }
  });
  return targetIndex;
};

module.exports = SkeletonRendezvousHasher;
