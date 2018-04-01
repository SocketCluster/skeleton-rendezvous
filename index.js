var crypto = require('crypto');

function SkeletonRendezvousHasher(options) {
  options = options || {};
  this.base = options.base || 2;
  this.hashAlgorithm = options.hashAlgorithm || 'md5';
  this.targetClusterSize = options.targetClusterSize || 10;
  this.minClusterSize = options.minClusterSize || 8;
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

SkeletonRendezvousHasher.prototype._generateClusters = function (sites) {
  sites.sort();
  this.clusters = [];
  this.clusterCount = Math.ceil(sites.length / this.targetClusterSize);
  for (var i = 0; i < this.clusterCount; i++) {
    this.clusters[i] = [];
  }

  var clusterIndex = 0;
  sites.forEach((site) => {
    var cluster = this.clusters[clusterIndex];
    cluster.push(site);
    if (cluster.length >= this.targetClusterSize) {
      clusterIndex++;
    }
  });

  if (this.clusterCount > 1) {
    var lastCluster = this.clusters[this.clusterCount - 1];
    if (lastCluster.length < this.minClusterSize) {
      this.clusters.pop();
      this.clusterCount--;
      clusterIndex = 0;

      lastCluster.forEach((site) => {
        var cluster = this.clusters[clusterIndex];
        cluster.push(site);
        clusterIndex = (clusterIndex + 1) % this.clusterCount;
      });
    }
  }
  this.virtualLevelCount = this._getvirtualLevelCount(this.clusterCount, this.base);
};

// Time complexity O(n)
// where n is the total number of sites.
SkeletonRendezvousHasher.prototype.addSites = function (sitesToAdd) {
  var sites = this.getSites().concat(sitesToAdd);
  this._generateClusters(sites);
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
  this._generateClusters(sites);
};

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
