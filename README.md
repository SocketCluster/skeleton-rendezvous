# skeleton-rendezvous
Node.js module for performing fast rendezvous (HRW) hashing with skeleton - Can efficiently handle a large number of machines/sites.

This approach is slower than consistent hashing but provides much more even distribution of keys across sites - Particularly when there are a large number of sites and keys;
the distribution gets progressively better as you add more keys. It can be configured to prioritize different features (e.g. distribution, performance, remapping %).

Last test results:

```
  API
    When adding a site twice during instantiation
      ✓ should not contain duplicate sites
    When adding a site a second time after instantiation
      ✓ should not contain duplicate sites
    When adding a site as a string argument instead of an array
      ✓ should add the site
    When trying to find a site when the sites list is empty
      ✓ should not throw an error
      ✓ result should be null
    When trying to remove a site which is not in the list
      ✓ should not throw an error
      ✓ should have removed the sites that were in the sites list
    When trying to remove a single site as a string instead of an array
      ✓ should not throw an error
      ✓ should have removed the site
    When passing null as the argument to findSite
      ✓ should not throw an error
    Calling setSites with an array of sites should replace all existing sites
      ✓ should map keys across latest sites list
    Calling setSites with a single site string should replace all existing sites
      ✓ should not throw error
      ✓ should map keys across latest sites list

  Distribution
    SRH distributes 1000 keys between 3 sites
      ✓ should return 1000 valid targets
        Key distribution difference between min and max sites: 1.1596091205211727
      ✓ should distribute keys evenly between sites
        Duration: 2 ms
      ✓ should take less than 50 ms to complete on a decent machine
    SRH distributes 1000 keys between 4 sites after one new site is added
        Key distribution difference between min and max sites: 1.150214592274678
      ✓ should distribute keys evenly between sites after adding the new site
        Moved 240 keys out of 1000
      ✓ less than 28% of keys should have changed site after adding the new site
    SRH distributes 1000 keys between 3 sites after the host3 site is removed
        Key distribution difference between min and max sites: 1.1596091205211727
      ✓ should distribute keys evenly between sites after removing the site
        Moved 261 keys out of 1000
      ✓ less than 28% of keys should have changed site after removing the site
    SRH distributes 10000 keys between 20 sites
      ✓ should return 10000 valid targets
        Key distribution difference between min and max sites: 1.1695278969957081
      ✓ should distribute keys evenly between sites
        Duration: 114 ms
      ✓ should take less than 500 ms to complete on a decent machine
    SRH distributes 20000 keys between 21 sites after one new site is added
        Key distribution difference between min and max sites: 1.118232044198895
      ✓ should distribute keys evenly between sites after adding the new site
        Moved 972 keys out of 20000
      ✓ less than 5% of keys should have changed site after adding the new site
    SRH distributes 40000 keys between 100 sites after one new site is added
        Key distribution difference between min and max sites: 1.2706552706552707
      ✓ should distribute keys evenly between sites after adding the new site
        Moved 784 keys out of 40000
      ✓ less than 2.5% of keys should have changed site after adding the new site
    SRH distributes 10000 keys between 20 sites after the host9 site is removed
        Key distribution difference between min and max sites: 1.1404255319148937
      ✓ should distribute keys evenly between sites after removing the site
        Moved 452 keys out of 10000
      ✓ less than 5.5% of keys should have changed site after removing the site
    SRH distributes 40000 keys between 96 sites after the host11 site is removed
        Key distribution difference between min and max sites: 1.2338709677419355
      ✓ should distribute keys evenly between sites after removing the site
        Moved 775 keys out of 40000
      ✓ less than 2.5% of keys should have changed site after removing the site
    SRH distributes 40000 keys between 1000 sites after the host4 site is removed
        Moved 150 keys out of 40000
      ✓ less than 0.5% of keys should have changed site after removing the site
    SRH distributes 10000 keys between 20 sites after the host9, host10 and host22 sites are removed
        Key distribution difference between min and max sites: 1.1373390557939915
      ✓ should distribute keys evenly between sites after removing the sites
        Moved 1251 keys out of 10000
      ✓ less than 15% of keys should have changed site after removing the sites
    SRH distributes 10000 keys between 33 sites after the single cluster splits in two
      ✓ should split the single cluster in two
        Keys owned by more than one site: 0 before the split, 0 after
      ✓ should not have any key owned by more than one site before or after the split
        Moved 4633 keys out of 10000
      ✓ less than 50% of keys should have changed site after the split
    SRH distributes 10000 keys between 55 sites after one of the two clusters splits
      ✓ should split one of the two clusters in two
        Moved 3010 keys out of 10000
      ✓ less than 35% of keys should have changed site after the split
    SRH distributes 10000 keys between 70 sites after one of the three clusters splits
      ✓ should split one of the three clusters in two
        Moved 2401 keys out of 10000
      ✓ less than 28% of keys should have changed site after the split
    SRH adds one site at a time to site lists which do not split a cluster
      ✓ should leave the cluster layout unchanged at every step
        33 sites: moved 3.94% against a minimum of 2.94% (1.34x)
        40 sites: moved 3.05% against a minimum of 2.44% (1.25x)
        47 sites: moved 2.71% against a minimum of 2.08% (1.30x)
        53 sites: moved 2.49% against a minimum of 1.85% (1.34x)
      ✓ should move less than 1.5 times the minimum number of keys at every step

  Fanout
    SRH distributes 20000 keys between 40 sites with a fanout of 9
      ✓ should hash each branch separately rather than slicing a single digest
      ✓ should return 20000 valid targets
        Key distribution difference between min and max sites: 1.206208425720621
      ✓ should distribute keys evenly between sites
    SRH distributes 20000 keys between 300 sites with a fanout of 9
      ✓ should walk more than one level of the skeleton
        Sites without keys: 0 out of 300
      ✓ should give every site a share of the keys

  Time complexity
    SRH distributes 10000 keys in O(log n) time with respect to the number of sites
        Duration with 100 sites: 146 ms
        Duration with 1000 sites: 171 ms
      ✓ should be able to handle 10 times the number of sites while using less than 50% extra time


  49 passing (17s)
```
