# skeleton-rendezvous
Node.js module for performing fast rendezvous (HRW) hashing with skeleton - Can efficiently handle a large number of machines/sites.

This approach is slower than consistent hashing but provides much more even distribution of keys across sites - Particularly when there are a large number of sites and keys;
the distribution gets progressively better as you add more keys. It can be configured to prioritize different features (e.g. distribution, performance, remapping %).

Last test results:

```bash
Distribution
  SRH distributes 1000 keys between 3 sites
    ✓ should return 1000 valid targets
      Key distribution difference between min and max sites: 1.1596091205211727
    ✓ should distribute keys evenly between sites
      Duration: 7 ms
    ✓ should take less than 50 ms to complete on a decent machine
  SRH distributes 1000 keys between 4 sites after one new site is added
      Key distribution difference between min and max sites: 1.150214592274678
    ✓ should distribute keys evenly between sites after adding the new site
      Moved 240 keys out of 1000
    ✓ less than 30% of keys should have changed site after adding the new site
  SRH distributes 1000 keys between 3 sites after the host3 site is removed
      Key distribution difference between min and max sites: 1.1596091205211727
    ✓ should distribute keys evenly between sites after removing the site
      Moved 261 keys out of 1000
    ✓ less than 30% of keys should have changed site after removing the site
  SRH distributes 10000 keys between 20 sites
    ✓ should return 10000 valid targets
      Key distribution difference between min and max sites: 1.1695278969957081
    ✓ should distribute keys evenly between sites
      Duration: 390 ms
    ✓ should take less than 500 ms to complete on a decent machine
  SRH distributes 20000 keys between 21 sites after one new site is added
      Key distribution difference between min and max sites: 1.118232044198895
    ✓ should distribute keys evenly between sites after adding the new site
      Moved 972 keys out of 20000
    ✓ less than 5% of keys should have changed site after adding the new site
  SRH distributes 40000 keys between 100 sites after one new site is added
      Key distribution difference between min and max sites: 1.3151862464183381
    ✓ should distribute keys evenly between sites after adding the new site
      Moved 349 keys out of 40000
    ✓ less than 10% of keys should have changed site after adding the new site
  SRH distributes 10000 keys between 20 sites after the host9 site is removed
      Key distribution difference between min and max sites: 1.1404255319148937
    ✓ should distribute keys evenly between sites after removing the site
      Moved 452 keys out of 10000
    ✓ less than 6% of keys should have changed site after removing the site
  SRH distributes 40000 keys between 96 sites after the host11 site is removed
      Key distribution difference between min and max sites: 1.2595628415300546
    ✓ should distribute keys evenly between sites after removing the site
      Moved 4930 keys out of 40000
    ✓ less than 15% of keys should have changed site after removing the site
  SRH distributes 40000 keys between 1000 sites after the host4 site is removed
      Moved 3755 keys out of 40000
    ✓ less than 15% of keys should have changed site after removing the site
  SRH distributes 10000 keys between 20 sites after the host9, host10 and host22 sites are removed
      Key distribution difference between min and max sites: 1.1373390557939915
    ✓ should distribute keys evenly between sites after removing the sites
      Moved 1251 keys out of 10000
    ✓ less than 30% of keys should have changed site after removing the sites

Time complexity
  SRH distributes 10000 keys in O(log n) time with respect to the number of sites
      Duration with 100 sites: 518 ms
      Duration with 1000 sites: 626 ms
    ✓ should be able to handle 10 times the number of sites while using less than 30% extra time

```
