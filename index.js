var crypto = require('crypto');

function SkeletonRendezvousHasher(options) {
  options = options || {};
  this.base = options.base || 3;
  this.hashAlgorithm = options.hashAlgorithm || 'md5';
  this.clusterSize = options.clusterSize || 4;
  this.clusters = [];
  this.addSites(options.sites);
};

SkeletonRendezvousHasher.prototype._logx = function (value, base) {
  return Math.log(value) / Math.log(base);
};

SkeletonRendezvousHasher.prototype._getvirtualLevelCount = function (siteCount, base) {
  return Math.ceil(this._logx(siteCount, base));
};

SkeletonRendezvousHasher.prototype.hash = function (key) {
  var hasher = crypto.createHash(this.hashAlgorithm);
  hasher.update(key);
  return hasher.digest('hex');
};

SkeletonRendezvousHasher.prototype.getSites = function () {
  var sites = [];
  this.clusters.forEach((clusterSites) => {
    clusterSites.forEach((site) => {
      sites.push(site);
    });
  });
  return sites;
};

SkeletonRendezvousHasher.prototype._generateSiteClusters = function (sites) {
  sites.sort();
  this.clusters = [];
  this.clusterCount = Math.ceil(sites.length / this.clusterSize);
  for (var i = 0; i < this.clusterCount; i++) {
    this.clusters[i] = [];
  }
  this.virtualLevelCount = this._getvirtualLevelCount(this.clusterCount, this.base);

  var avgClusterSize = Math.round(sites.length / this.clusterCount);
  console.log(44444, avgClusterSize);

  var clusterIndex = 0;
  sites.forEach((site) => {
    // var clusterIndex = this._findSiteClusterIndex(site, this.clusters);
    var cluster = this.clusters[clusterIndex];
    cluster.push(site);
    if (cluster.length >= avgClusterSize) {
      clusterIndex++;
    }
  });
};

// Time complexity O(n)
// where n is the total number of sites.
// TODO: Check how it handles duplicate sites
SkeletonRendezvousHasher.prototype.addSites = function (sitesToAdd) {
  var sites = this.getSites().concat(sitesToAdd);
  this._generateSiteClusters(sites);
};

// Time complexity O(n)
// where n is the total number of sites.
SkeletonRendezvousHasher.prototype.removeSites = function (sitesToRemove) {
  var removeSiteLookup = {};
  sitesToRemove.forEach((site) => {
    removeSiteLookup[site] = true;
  });
  var sites = this.getSites().filter((site) => {
    return !removeSiteLookup[site];
  });
  this._generateSiteClusters(sites);
  // this.sites = this.sites.filter((site) => {
  //   return !removeSiteLookup[site];
  // });
  // this.virtualLevelCount = this._getvirtualLevelCount(this.sites.length, this.base);
};

// Time complexity: O(log n)
// where n is the total number of sites.
// SkeletonRendezvousHasher.prototype.findSiteIndex = function (key) {
//   var targetSiteIndex = 0;
//   var salt = 0;
//   var siteCount = this.sites.length;
//
//   for (var i = 0; i < this.virtualLevelCount; i++) {
//     var highestHash = null;
//     var targetGroup = 0;
//
//     for (var j = 0; j < this.base; j++) {
//       var currentHash = this.hash(key + i + j + (salt || ''));
//       if (!highestHash || currentHash > highestHash) {
//         highestHash = currentHash;
//         targetGroup = j;
//       }
//     }
//     var addSiteIndex = targetGroup * Math.pow(this.base, this.virtualLevelCount - i - 1);
//     if (targetSiteIndex + addSiteIndex < siteCount) {
//       targetSiteIndex += addSiteIndex;
//     } else {
//       // Try to find a valid site again with an incremented salt (from the root of the tree).
//       salt++;
//       targetSiteIndex = 0;
//       i = -1;
//     }
//   }
//   return targetSiteIndex;
// };

// Time complexity: O(log n)
// where n is the total number of sites.
SkeletonRendezvousHasher.prototype.findSite = function (key, salt) {
  salt = salt || 0;
  var path = '';

  for (var i = 0; i < this.virtualLevelCount; i++) {
    var highestHash = null;
    var targetVirtualGroup = 0;

    for (var j = 0; j < this.base; j++) {
      var currentHash = this.hash(key + (salt || '') + path + j);
      if (!highestHash || currentHash > highestHash) {
        highestHash = currentHash;
        targetVirtualGroup = j;
      }
    }
    path += targetVirtualGroup.toString();
  }
  var targetClusterIndex = parseInt(path, this.base) || 0;
  var targetCluster = this.clusters[targetClusterIndex];

  if (targetCluster == null) {
    return this.findSite(key, salt + 1);
  }

  var keyIndexWithinCluster = this._findIndexWithHighestRandomWeight(key, targetCluster);
  var targetSite = targetCluster[keyIndexWithinCluster];
  if (targetSite == null) {
    return this.findSite(key, salt + 1);
  }
  return targetSite;
};

SkeletonRendezvousHasher.prototype._findIndexWithHighestRandomWeight = function (item, list) {
  var targetIndex = 0;
  var highestHash = null;

  (list || []).forEach((candidate, index) => {
    var currentHash = this.hash(item + candidate);
    if (!highestHash || currentHash > highestHash) {
      highestHash = currentHash;
      targetIndex = index;
    }
  });
  return targetIndex;
};

SkeletonRendezvousHasher.prototype._findSiteClusterIndex = function (site, clusterList) {
  return this._findIndexWithHighestRandomWeight(site, clusterList);
};

module.exports = SkeletonRendezvousHasher;
