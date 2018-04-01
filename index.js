var crypto = require('crypto');

function SkeletonRendezvousHasher(options) {
  options = options || {};
  this.base = options.base || 2;
  this.hashAlgorithm = options.hashAlgorithm || 'md5';
  this.addSites(options.sites);
};

SkeletonRendezvousHasher.prototype._logx = function (value, base) {
  return Math.log(value) / Math.log(base);
};

SkeletonRendezvousHasher.prototype._getLevelCount = function (siteCount, base) {
  return Math.ceil(this._logx(siteCount, base));
};

SkeletonRendezvousHasher.prototype.hash = function (key) {
  var hasher = crypto.createHash(this.hashAlgorithm);
  hasher.update(key);
  return hasher.digest('hex');
};

// Time complexity O(n)
// where n is the total number of sites.
SkeletonRendezvousHasher.prototype.addSites = function (sitesToAdd) {
  this.sites = (this.sites || []).concat(sitesToAdd);
  this.levelCount = this._getLevelCount(this.sites.length, this.base);
};

// Time complexity O(n)
// where n is the total number of sites.
SkeletonRendezvousHasher.prototype.removeSites = function (sitesToRemove) {
  var removeSiteLookup = {};
  sitesToRemove.forEach((site) => {
    removeSiteLookup[site] = true;
  });
  this.sites = this.sites.filter((site) => {
    return !removeSiteLookup[site];
  });
};

// Time complexity: O(log n)
// where n is the total number of sites.
SkeletonRendezvousHasher.prototype.findSiteIndex = function (key) {
  var targetSiteIndex = 0;
  var salt = 0;
  var siteCount = this.sites.length;

  for (var i = 0; i < this.levelCount; i++) {
    var highestHash = null;
    var targetGroup = 0;

    for (var j = 0; j < this.base; j++) {
      var currentHash = this.hash(key + i + j + (salt || ''));
      if (!highestHash || currentHash > highestHash) {
        highestHash = currentHash;
        targetGroup = j;
      }
    }
    var addSiteIndex = targetGroup * Math.pow(this.base, this.levelCount - i - 1);
    if (targetSiteIndex + addSiteIndex < siteCount) {
      targetSiteIndex += addSiteIndex;
    } else {
      // Try to find a valid site again with an incremented salt (from the root of the tree).
      salt++;
      targetSiteIndex = 0;
      i = -1;
    }
  }
  return targetSiteIndex;
};

// Time complexity: O(log n)
// where n is the total number of sites.
SkeletonRendezvousHasher.prototype.findSite = function (key) {
  var targetSiteIndex = this.findSiteIndex(key);
  return this.sites[targetSiteIndex];
};

module.exports = SkeletonRendezvousHasher;
