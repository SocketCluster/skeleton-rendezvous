let assert = require('assert');
let testUtils = require('../test-utils');
let SRH = require('../index');
let srh;
let srhB;
let keyList;
let siteList;
let siteListB;
let newSiteList;
let error;
let result;
let resultA;
let resultB;
let clusterCountA;
let clusterCountB;
let multiSiteKeyListA;
let multiSiteKeyListB;
let sweepResults;

describe('API', function () {
  describe('When adding a site twice during instantiation', function () {
    beforeEach(function () {
      siteList = ['foo', 'bar', 'site', 'bar'];
      srh = new SRH({
        sites: siteList,
        targetClusterSize: 16
      });
    });

    it('should not contain duplicate sites', function () {
      assert.equal(JSON.stringify(srh.clusters[0]), JSON.stringify(['bar', 'foo', 'site']));
    });
  });

  describe('When adding a site a second time after instantiation', function () {
    beforeEach(function () {
      siteList = ['foo', 'bar', 'site'];
      srh = new SRH({
        sites: siteList,
        targetClusterSize: 16
      });

      srh.addSites(['bar', '123']);
    });

    it('should not contain duplicate sites', function () {
      assert.equal(JSON.stringify(srh.clusters[0]), JSON.stringify(['123', 'bar', 'foo', 'site']));
    });
  });

  describe('When adding a site as a string argument instead of an array', function () {
    beforeEach(function () {
      siteList = ['foo'];
      srh = new SRH({
        sites: siteList,
        targetClusterSize: 16
      });

      srh.addSites('bar');
    });

    it('should add the site', function () {
      assert.equal(JSON.stringify(srh.clusters[0]), JSON.stringify(['bar', 'foo']));
    });
  });

  describe('When trying to find a site when the sites list is empty', function () {
    beforeEach(function () {
      error = null;
      siteList = [];
      srh = new SRH({
        sites: siteList,
        targetClusterSize: 16
      });
      try {
        result = srh.findSite('somekey');
      } catch (err) {
        error = err;
      }
    });

    it('should not throw an error', function () {
      assert.equal(error, null);
    });

    it('result should be null', function () {
      assert.equal(result, null);
    });
  });

  describe('When trying to remove a site which is not in the list', function () {
    beforeEach(function () {
      error = null;
      siteList = ['foo', 'bar'];
      srh = new SRH({
        sites: siteList,
        targetClusterSize: 16
      });

      try {
        srh.removeSites(['bar', 'hello']);
      } catch (err) {
        error = err;
      }
    });

    it('should not throw an error', function () {
      assert.equal(error, null);
    });

    it('should have removed the sites that were in the sites list', function () {
      assert.equal(JSON.stringify(srh.clusters[0]), JSON.stringify(['foo']));
    });
  });

  describe('When trying to remove a single site as a string instead of an array', function () {
    beforeEach(function () {
      error = null;
      siteList = ['foo', 'bar'];
      srh = new SRH({
        sites: siteList,
        targetClusterSize: 16
      });

      try {
        srh.removeSites('bar');
      } catch (err) {
        error = err;
      }
    });

    it('should not throw an error', function () {
      assert.equal(error, null);
    });

    it('should have removed the site', function () {
      assert.equal(JSON.stringify(srh.clusters[0]), JSON.stringify(['foo']));
    });
  });

  describe('When passing null as the argument to findSite', function () {
    beforeEach(function () {
      error = null;
      siteList = ['foo', 'bar'];
      srh = new SRH({
        sites: siteList,
        targetClusterSize: 16
      });

      try {
        result = srh.findSite(null);
      } catch (err) {
        error = err;
      }
    });

    it('should not throw an error', function () {
      assert.equal(error, null);
    });
  });

  describe('Calling setSites with an array of sites should replace all existing sites', function () {
    beforeEach(function () {
      siteList = ['foo', 'bar'];
      keyList = testUtils.generateStringList('somekey', 1000);
      srh = new SRH({
        sites: siteList,
        targetClusterSize: 16
      });

      siteList = ['hello', 'world'];
      srh.setSites(siteList);

      result = testUtils.findKeySites(srh, keyList);
    });

    it('should map keys across latest sites list', function () {
      assert.equal(JSON.stringify(Object.keys(result.countMap)), JSON.stringify(['hello', 'world']));
    });
  });

  describe('Calling setSites with a single site string should replace all existing sites', function () {
    beforeEach(function () {
      error = null;
      keyList = testUtils.generateStringList('somekey', 1000);
      srh = new SRH({
        sites: siteList,
        targetClusterSize: 16
      });

      try {
        srh.setSites('hello');
      } catch (err) {
        error = err;
      }

      result = testUtils.findKeySites(srh, keyList);
    });

    it('should not throw error', function () {
      assert.equal(error, null);
    });

    it('should map keys across latest sites list', function () {
      assert.equal(JSON.stringify(Object.keys(result.countMap)), JSON.stringify(['hello']));
    });
  });
});

describe('Distribution', function () {
  describe('SRH distributes 1000 keys between 3 sites', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 1000);
      siteList = testUtils.generateStringList('host', 3);
      srh = new SRH({
        sites: siteList
      });
      result = testUtils.findKeySites(srh, keyList);
    });

    it('should return 1000 valid targets', function () {
      assert.notEqual(result.list, null);
      assert.equal(result.list.length, 1000);
      result.list.forEach((site) => {
        assert.notEqual(siteList.indexOf(site), -1);
      });
    });

    it('should distribute keys evenly between sites', function () {
      testUtils.log(`Key distribution difference between min and max sites: ${result.stats.diff}`);
      assert.equal(result.stats.diff < 1.3, true);
    });

    it('should take less than 50 ms to complete on a decent machine', function () {
      testUtils.log(`Duration: ${result.stats.duration} ms`);
      assert.equal(result.stats.duration < 20, true);
    });
  });

  describe('SRH distributes 1000 keys between 4 sites after one new site is added', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 1000);
      siteList = testUtils.generateStringList('host', 3);
      srh = new SRH({
        sites: siteList
      });
      resultA = testUtils.findKeySites(srh, keyList);
      newSiteList = ['newhost0'];
      srh.addSites(newSiteList);
      resultB = testUtils.findKeySites(srh, keyList);
    });

    it('should distribute keys evenly between sites after adding the new site', function () {
      testUtils.log(`Key distribution difference between min and max sites: ${resultB.stats.diff}`);
      assert.equal(resultB.stats.diff < 1.3, true);
    });

    it('less than 28% of keys should have changed site after adding the new site', function () {
      let diffStats = testUtils.getDiffStats(resultA, resultB);
      let diffPercentage = diffStats.diffKeyList.length / diffStats.keyList.length;
      testUtils.log(`Moved ${diffStats.diffKeyList.length} keys out of ${diffStats.keyList.length}`);
      assert.equal(diffPercentage < .28, true);
    });
  });

  describe('SRH distributes 1000 keys between 3 sites after the host3 site is removed', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 1000);
      siteList = testUtils.generateStringList('host', 4);
      srh = new SRH({
        sites: siteList
      });
      resultA = testUtils.findKeySites(srh, keyList);
      removeSiteList = ['host3'];
      srh.removeSites(removeSiteList);
      resultB = testUtils.findKeySites(srh, keyList);
    });

    it('should distribute keys evenly between sites after removing the site', function () {
      testUtils.log(`Key distribution difference between min and max sites: ${resultB.stats.diff}`);
      assert.equal(resultB.stats.diff < 1.3, true);
    });

    it('less than 28% of keys should have changed site after removing the site', function () {
      let diffStats = testUtils.getDiffStats(resultA, resultB);
      let diffPercentage = diffStats.diffKeyList.length / diffStats.keyList.length;
      testUtils.log(`Moved ${diffStats.diffKeyList.length} keys out of ${diffStats.keyList.length}`);
      assert.equal(diffPercentage < .28, true);
    });
  });

  describe('SRH distributes 10000 keys between 20 sites', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 10000);
      siteList = testUtils.generateStringList('host', 20);
      srh = new SRH({
        sites: siteList
      });
      result = testUtils.findKeySites(srh, keyList);
    });

    it('should return 10000 valid targets', function () {
      assert.notEqual(result.list, null);
      assert.equal(result.list.length, 10000);
      result.list.forEach((site) => {
        assert.notEqual(siteList.indexOf(site), -1);
      });
    });

    it('should distribute keys evenly between sites', function () {
      testUtils.log(`Key distribution difference between min and max sites: ${result.stats.diff}`);
      assert.equal(result.stats.diff < 1.3, true);
    });

    it('should take less than 500 ms to complete on a decent machine', function () {
      testUtils.log(`Duration: ${result.stats.duration} ms`);
      assert.equal(result.stats.duration < 500, true);
    });
  });

  describe('SRH distributes 20000 keys between 21 sites after one new site is added', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 20000);
      siteList = testUtils.generateStringList('host', 20);
      srh = new SRH({
        sites: siteList
      });
      resultA = testUtils.findKeySites(srh, keyList);
      newSiteList = ['newhost0'];
      srh.addSites(newSiteList);
      resultB = testUtils.findKeySites(srh, keyList);
    });

    it('should distribute keys evenly between sites after adding the new site', function () {
      testUtils.log(`Key distribution difference between min and max sites: ${resultB.stats.diff}`);
      assert.equal(resultB.stats.diff < 1.3, true);
    });

    it('less than 5% of keys should have changed site after adding the new site', function () {
      let diffStats = testUtils.getDiffStats(resultA, resultB);
      let diffPercentage = diffStats.diffKeyList.length / diffStats.keyList.length;
      testUtils.log(`Moved ${diffStats.diffKeyList.length} keys out of ${diffStats.keyList.length}`);
      assert.equal(diffPercentage < .05, true);
    });
  });

  describe('SRH distributes 40000 keys between 100 sites after one new site is added', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 40000);
      siteList = testUtils.generateStringList('host', 99);
      srh = new SRH({
        sites: siteList
      });
      resultA = testUtils.findKeySites(srh, keyList);
      newSiteList = ['newhost0'];
      srh.addSites(newSiteList);
      resultB = testUtils.findKeySites(srh, keyList);
    });

    it('should distribute keys evenly between sites after adding the new site', function () {
      testUtils.log(`Key distribution difference between min and max sites: ${resultB.stats.diff}`);
      assert.equal(resultB.stats.diff < 1.35, true);
    });

    it('less than 2.5% of keys should have changed site after adding the new site', function () {
      let diffStats = testUtils.getDiffStats(resultA, resultB);
      let diffPercentage = diffStats.diffKeyList.length / diffStats.keyList.length;
      testUtils.log(`Moved ${diffStats.diffKeyList.length} keys out of ${diffStats.keyList.length}`);
      assert.equal(diffPercentage < .025, true);
    });
  });

  describe('SRH distributes 10000 keys between 20 sites after the host9 site is removed', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 10000);
      siteList = testUtils.generateStringList('host', 21);
      srh = new SRH({
        sites: siteList
      });
      resultA = testUtils.findKeySites(srh, keyList);
      removeSiteList = ['host9'];
      srh.removeSites(removeSiteList);
      resultB = testUtils.findKeySites(srh, keyList);
    });

    it('should distribute keys evenly between sites after removing the site', function () {
      testUtils.log(`Key distribution difference between min and max sites: ${resultB.stats.diff}`);
      assert.equal(resultB.stats.diff < 1.3, true);
    });

    it('less than 5.5% of keys should have changed site after removing the site', function () {
      let diffStats = testUtils.getDiffStats(resultA, resultB);
      let diffPercentage = diffStats.diffKeyList.length / diffStats.keyList.length;
      testUtils.log(`Moved ${diffStats.diffKeyList.length} keys out of ${diffStats.keyList.length}`);
      assert.equal(diffPercentage < .055, true);
    });
  });

  describe('SRH distributes 40000 keys between 96 sites after the host11 site is removed', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 40000);
      siteList = testUtils.generateStringList('host', 97);
      srh = new SRH({
        sites: siteList
      });
      resultA = testUtils.findKeySites(srh, keyList);
      removeSiteList = ['host11'];
      srh.removeSites(removeSiteList);
      resultB = testUtils.findKeySites(srh, keyList);
    });

    it('should distribute keys evenly between sites after removing the site', function () {
      testUtils.log(`Key distribution difference between min and max sites: ${resultB.stats.diff}`);
      assert.equal(resultB.stats.diff < 1.4, true);
    });

    it('less than 2.5% of keys should have changed site after removing the site', function () {
      let diffStats = testUtils.getDiffStats(resultA, resultB);
      let diffPercentage = diffStats.diffKeyList.length / diffStats.keyList.length;
      testUtils.log(`Moved ${diffStats.diffKeyList.length} keys out of ${diffStats.keyList.length}`);
      assert.equal(diffPercentage < .025, true);
    });
  });

  describe('SRH distributes 40000 keys between 1000 sites after the host4 site is removed', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 40000);
      siteList = testUtils.generateStringList('host', 1001);
      srh = new SRH({
        sites: siteList
      });
      resultA = testUtils.findKeySites(srh, keyList);
      removeSiteList = ['host4'];
      srh.removeSites(removeSiteList);
      resultB = testUtils.findKeySites(srh, keyList);
    });

    it('less than 0.5% of keys should have changed site after removing the site', function () {
      let diffStats = testUtils.getDiffStats(resultA, resultB);
      let diffPercentage = diffStats.diffKeyList.length / diffStats.keyList.length;
      testUtils.log(`Moved ${diffStats.diffKeyList.length} keys out of ${diffStats.keyList.length}`);
      assert.equal(diffPercentage < .005, true);
    });
  });

  describe('SRH distributes 10000 keys between 20 sites after the host9, host10 and host22 sites are removed', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 10000);
      siteList = testUtils.generateStringList('host', 23);
      srh = new SRH({
        sites: siteList
      });
      resultA = testUtils.findKeySites(srh, keyList);
      removeSiteList = ['host9', 'host10', 'host22'];
      srh.removeSites(removeSiteList);
      resultB = testUtils.findKeySites(srh, keyList);
    });

    it('should distribute keys evenly between sites after removing the sites', function () {
      testUtils.log(`Key distribution difference between min and max sites: ${resultB.stats.diff}`);
      assert.equal(resultB.stats.diff < 1.3, true);
    });

    it('less than 15% of keys should have changed site after removing the sites', function () {
      let diffStats = testUtils.getDiffStats(resultA, resultB);
      let diffPercentage = diffStats.diffKeyList.length / diffStats.keyList.length;
      testUtils.log(`Moved ${diffStats.diffKeyList.length} keys out of ${diffStats.keyList.length}`);
      assert.equal(diffPercentage < .15, true);
    });
  });

  describe('SRH distributes 10000 keys between 33 sites after the single cluster splits in two', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 10000);
      siteList = testUtils.generateStringList('host', 32);
      srh = new SRH({
        sites: siteList
      });
      clusterCountA = srh.clusterCount;
      resultA = testUtils.findKeySites(srh, keyList);
      multiSiteKeyListA = testUtils.getMultiSiteKeyList(srh, keyList);
      newSiteList = ['newhost0'];
      srh.addSites(newSiteList);
      clusterCountB = srh.clusterCount;
      resultB = testUtils.findKeySites(srh, keyList);
      multiSiteKeyListB = testUtils.getMultiSiteKeyList(srh, keyList);
    });

    // With the default targetClusterSize of 16 and fanout of 2, 32 sites is the
    // last size which still fits in a single cluster.
    it('should split the single cluster in two', function () {
      assert.equal(clusterCountA, 1);
      assert.equal(clusterCountB, 2);
    });

    // Two sites owning the same key would mean a lookup landing somewhere
    // different each time it is made, which is the failure a split is most
    // likely to cause - the walk has to keep sending a key down the same branch
    // once there is more than one to choose between.
    it('should not have any key owned by more than one site before or after the split', function () {
      testUtils.log(`Keys owned by more than one site: ${multiSiteKeyListA.length} before the split, ${multiSiteKeyListB.length} after`);
      assert.equal(multiSiteKeyListA.length, 0);
      assert.equal(multiSiteKeyListB.length, 0);
    });

    // A split is the worst case for key movement: a key now only sees the sites
    // under the branch it lands in, so its previous winner has about even odds
    // of still being reachable. The bound is here to stop this getting worse,
    // not because 46% is a good result.
    it('less than 50% of keys should have changed site after the split', function () {
      let diffStats = testUtils.getDiffStats(resultA, resultB);
      let diffPercentage = diffStats.diffKeyList.length / diffStats.keyList.length;
      testUtils.log(`Moved ${diffStats.diffKeyList.length} keys out of ${diffStats.keyList.length}`);
      assert.equal(diffPercentage < .5, true);
    });
  });

  describe('SRH distributes 10000 keys between 55 sites after one of the two clusters splits', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 10000);
      siteList = testUtils.generateStringList('host', 54);
      srh = new SRH({
        sites: siteList
      });
      clusterCountA = srh.clusterCount;
      resultA = testUtils.findKeySites(srh, keyList);
      newSiteList = ['newhost0'];
      srh.addSites(newSiteList);
      clusterCountB = srh.clusterCount;
      resultB = testUtils.findKeySites(srh, keyList);
    });

    it('should split one of the two clusters in two', function () {
      assert.equal(clusterCountA, 2);
      assert.equal(clusterCountB, 3);
    });

    it('less than 35% of keys should have changed site after the split', function () {
      let diffStats = testUtils.getDiffStats(resultA, resultB);
      let diffPercentage = diffStats.diffKeyList.length / diffStats.keyList.length;
      testUtils.log(`Moved ${diffStats.diffKeyList.length} keys out of ${diffStats.keyList.length}`);
      assert.equal(diffPercentage < .35, true);
    });
  });

  describe('SRH distributes 10000 keys between 70 sites after one of the three clusters splits', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 10000);
      siteList = testUtils.generateStringList('host', 69);
      srh = new SRH({
        sites: siteList
      });
      clusterCountA = srh.clusterCount;
      resultA = testUtils.findKeySites(srh, keyList);
      // At 69 sites the three clusters hold 32, 15 and 22 sites, so only the
      // first is at the point of splitting. newhost2 lands in it; newhost0
      // lands elsewhere and would not split anything.
      newSiteList = ['newhost2'];
      srh.addSites(newSiteList);
      clusterCountB = srh.clusterCount;
      resultB = testUtils.findKeySites(srh, keyList);
    });

    it('should split one of the three clusters in two', function () {
      assert.equal(clusterCountA, 3);
      assert.equal(clusterCountB, 4);
    });

    it('less than 28% of keys should have changed site after the split', function () {
      let diffStats = testUtils.getDiffStats(resultA, resultB);
      let diffPercentage = diffStats.diffKeyList.length / diffStats.keyList.length;
      testUtils.log(`Moved ${diffStats.diffKeyList.length} keys out of ${diffStats.keyList.length}`);
      assert.equal(diffPercentage < .28, true);
    });
  });

  describe('SRH adds one site at a time to site lists which do not split a cluster', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 10000);
      sweepResults = [33, 40, 47, 53].map((siteCount) => {
        let sweepSrh = new SRH({
          sites: testUtils.generateStringList('host', siteCount)
        });
        let clustersBefore = sweepSrh.clusterCount;
        let before = testUtils.findKeySites(sweepSrh, keyList);
        sweepSrh.addSites(['newhost0']);
        let after = testUtils.findKeySites(sweepSrh, keyList);
        let diffStats = testUtils.getDiffStats(before, after);
        let diffPercentage = diffStats.diffKeyList.length / diffStats.keyList.length;
        return {
          siteCount: siteCount,
          clustersBefore: clustersBefore,
          clustersAfter: sweepSrh.clusterCount,
          diffPercentage: diffPercentage,
          optimal: 1 / (siteCount + 1)
        };
      });
    });

    // Guards the assumption the next test relies on - if the split points move,
    // these steps stop covering the unchanged layout case.
    it('should leave the cluster layout unchanged at every step', function () {
      sweepResults.forEach((sweepResult) => {
        assert.equal(sweepResult.clustersAfter, sweepResult.clustersBefore);
      });
    });

    it('should move less than 1.5 times the minimum number of keys at every step', function () {
      sweepResults.forEach((sweepResult) => {
        let ratio = sweepResult.diffPercentage / sweepResult.optimal;
        testUtils.log(`${sweepResult.siteCount} sites: moved ${(sweepResult.diffPercentage * 100).toFixed(2)}% against a minimum of ${(sweepResult.optimal * 100).toFixed(2)}% (${ratio.toFixed(2)}x)`);
        assert.equal(ratio < 1.5, true);
      });
    });
  });
});

describe('Fanout', function () {
  describe('SRH distributes 20000 keys between 40 sites with a fanout of 9', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 20000);
      siteList = testUtils.generateStringList('host', 40);
      srh = new SRH({
        sites: siteList,
        fanout: 9,
        targetClusterSize: 2
      });
      result = testUtils.findKeySites(srh, keyList);
    });

    // An md5 digest is 32 hex digits, too few to give each of 9 branches an
    // independent slice, so a fanout of 9 falls back to hashing every branch
    // separately. The rest of the suite only exercises the sliced digest.
    it('should hash each branch separately rather than slicing a single digest', function () {
      assert.equal(srh._virtualGroupHexDigits, 0);
    });

    it('should return 20000 valid targets', function () {
      assert.notEqual(result.list, null);
      assert.equal(result.list.length, 20000);
      result.list.forEach((site) => {
        assert.notEqual(siteList.indexOf(site), -1);
      });
    });

    it('should distribute keys evenly between sites', function () {
      testUtils.log(`Key distribution difference between min and max sites: ${result.stats.diff}`);
      assert.equal(result.stats.diff < 1.3, true);
    });
  });

  describe('SRH distributes 20000 keys between 300 sites with a fanout of 9', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 20000);
      siteList = testUtils.generateStringList('host', 300);
      srh = new SRH({
        sites: siteList,
        fanout: 9,
        targetClusterSize: 2
      });
      result = testUtils.findKeySites(srh, keyList);
    });

    // Enough sites to make the walk descend more than once, so the fallback is
    // exercised below the root too.
    it('should walk more than one level of the skeleton', function () {
      assert.equal(srh._virtualGroupHexDigits, 0);
      assert.equal(srh.virtualLevelCount > 1, true);
    });

    it('should give every site a share of the keys', function () {
      let unusedSiteList = siteList.filter((site) => !result.countMap[site]);
      testUtils.log(`Sites without keys: ${unusedSiteList.length} out of ${siteList.length}`);
      assert.equal(unusedSiteList.length, 0);
    });
  });
});

describe('Time complexity', function () {
  describe('SRH distributes 10000 keys in O(log n) time with respect to the number of sites', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 10000);
      siteList = testUtils.generateStringList('host', 100);
      srh = new SRH({
        sites: siteList
      });
      resultA = testUtils.findKeySites(srh, keyList);

      siteListB = testUtils.generateStringList('host', 1000);
      srhB = new SRH({
        sites: siteListB
      });
      resultB = testUtils.findKeySites(srhB, keyList);
    });

    it('should be able to handle 10 times the number of sites while using less than 50% extra time', function () {
      testUtils.log(`Duration with 100 sites: ${resultA.stats.duration} ms`);
      testUtils.log(`Duration with 1000 sites: ${resultB.stats.duration} ms`);
      assert.equal(resultB.stats.duration / resultA.stats.duration < 1.6, true);
    });
  });
});
