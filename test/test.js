var assert = require('assert');
var testUtils = require('../test-utils');
var SRH = require('skeleton-rendezvous');
var srh;
var srhB;
var keyList;
var siteList;
var siteListB;
var newSiteList;
var result;
var resultA;
var resultB;

describe('Distribution', function () {
  describe('SRH distributes 1000 keys between 3 sites', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 1000);
      siteList = testUtils.generateStringList('host', 3);
      srh = new SRH({
        sites: siteList,
        base: 2
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
      // For a large sample of keys across a small number of sites, we want
      // less than 5% difference between the most popular and least popular sites.
      testUtils.log(`Key distribution difference between min and max sites: ${result.stats.diff}`);
      assert.equal(result.stats.diff < 1.05, true);
    });

    it('should take less than 100 ms to complete on a decent machine', function () {
      testUtils.log(`Duration: ${result.stats.duration} ms`);
      assert.equal(result.stats.duration < 100, true);
    });
  });

  describe('SRH distributes 1000 keys between 4 sites after one new site is added', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 1000);
      siteList = testUtils.generateStringList('host', 3);
      srh = new SRH({
        sites: siteList,
        base: 2
      });
      resultA = testUtils.findKeySites(srh, keyList);
      newSiteList = ['newhost0'];
      srh.addSites(newSiteList);
      resultB = testUtils.findKeySites(srh, keyList);
    });

    it('should distribute keys evenly between sites after adding the new site', function () {
      testUtils.log(`Key distribution difference between min and max sites: ${resultB.stats.diff}`);
      assert.equal(resultB.stats.diff < 1.2, true);
    });

    it('less than 30% of keys should have changed site after adding the new site', function () {
      var diffStats = testUtils.getDiffStats(resultA, resultB);
      var diffPercentage = diffStats.diffKeyList.length / diffStats.keyList.length;
      testUtils.log(`Moved ${diffStats.diffKeyList.length} keys out of ${diffStats.keyList.length}`);
      assert.equal(diffPercentage < .3, true);
    });
  });

  describe('SRH distributes 1000 keys between 3 sites after the last site is removed', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 1000);
      siteList = testUtils.generateStringList('host', 4);
      srh = new SRH({
        sites: siteList,
        base: 2
      });
      resultA = testUtils.findKeySites(srh, keyList);
      removeSiteList = ['host3'];
      srh.removeSites(removeSiteList);
      resultB = testUtils.findKeySites(srh, keyList);
    });

    it('should distribute keys evenly between sites after removing the site', function () {
      testUtils.log(`Key distribution difference between min and max sites: ${resultB.stats.diff}`);
      assert.equal(resultB.stats.diff < 1.1, true);
    });

    it('less than 30% of keys should have changed site after removing the site', function () {
      var diffStats = testUtils.getDiffStats(resultA, resultB);
      var diffPercentage = diffStats.diffKeyList.length / diffStats.keyList.length;
      testUtils.log(`Moved ${diffStats.diffKeyList.length} keys out of ${diffStats.keyList.length}`);
      assert.equal(diffPercentage < .3, true);
    });
  });

  describe('SRH distributes 10000 keys between 20 sites', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 10000);
      siteList = testUtils.generateStringList('host', 20);
      srh = new SRH({
        sites: siteList,
        base: 2
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
      // For a very large sample of keys across a large number of sites, we want
      // less than 30% difference between the most popular and least popular sites.
      testUtils.log(`Key distribution difference between min and max sites: ${result.stats.diff}`);
      assert.equal(result.stats.diff < 1.3, true);
    });

    it('should take less than 500 ms to complete on a decent machine', function () {
      testUtils.log(`Duration: ${result.stats.duration} ms`);
      assert.equal(result.stats.duration < 500, true);
    });
  });

  describe('SRH distributes 10000 keys between 21 sites after one new site is added', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 10000);
      siteList = testUtils.generateStringList('host', 20);
      srh = new SRH({
        sites: siteList,
        base: 2
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
      var diffStats = testUtils.getDiffStats(resultA, resultB);
      var diffPercentage = diffStats.diffKeyList.length / diffStats.keyList.length;
      testUtils.log(`Moved ${diffStats.diffKeyList.length} keys out of ${diffStats.keyList.length}`);
      assert.equal(diffPercentage < .05, true);
    });
  });

  describe('SRH distributes 10000 keys between 20 sites after the 10th site is removed', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 10000);
      siteList = testUtils.generateStringList('host', 21);
      srh = new SRH({
        sites: siteList,
        base: 2
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

    it('less than 6% of keys should have changed site after removing the site', function () {
      var diffStats = testUtils.getDiffStats(resultA, resultB);
      var diffPercentage = diffStats.diffKeyList.length / diffStats.keyList.length;
      testUtils.log(`Moved ${diffStats.diffKeyList.length} keys out of ${diffStats.keyList.length}`);
      assert.equal(diffPercentage < .06, true);
    });
  });

  describe('SRH distributes 10000 keys between 20 sites after the 10th, 11th and 23rd sites are removed', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 10000);
      siteList = testUtils.generateStringList('host', 23);
      srh = new SRH({
        sites: siteList,
        base: 2
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
      var diffStats = testUtils.getDiffStats(resultA, resultB);
      var diffPercentage = diffStats.diffKeyList.length / diffStats.keyList.length;
      testUtils.log(`Moved ${diffStats.diffKeyList.length} keys out of ${diffStats.keyList.length}`);
      assert.equal(diffPercentage < .15, true);
    });
  });
});

describe('Time complexity', function () {
  describe('SRH distributes keys in O(log n) time with respect to the number of sites', function () {
    beforeEach(function () {
      keyList = testUtils.generateStringList('somekey', 10000);
      siteList = testUtils.generateStringList('host', 100);
      srh = new SRH({
        sites: siteList,
        base: 2
      });
      resultA = testUtils.findKeySites(srh, keyList);

      siteListB = testUtils.generateStringList('host', 1000);
      srhB = new SRH({
        sites: siteListB,
        base: 2
      });
      resultB = testUtils.findKeySites(srhB, keyList);
    });

    it('should be able to handle 10 times the number of sites while using up less than 50% extra time', function () {
      assert.equal(resultB.stats.duration / resultA.stats.duration < 1.5, true);
    });
  });
});
