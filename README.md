# liveAthletics
athletics / track and field competition management software

This software is under developement. 
An exemplary online might (!) be found at [liveathletics.ch](https://liveathletics.ch).

In the final version, liveAthletics will provide all funcctionality needed to manage large competitions, including the competition management (entries, seeding, recording results, qualifications, result views, team events, combined events, groups, automatic backup+replication) as well as traffic-efficient live results for thousands of clients. Any change of data is instantly broadcasted (with websocksets) to all clients that depend on this data. Multiple-servers are kept up-to-date automatically, which allows load balancing and automatic back-up. 

LiveAthletics shall be the most versatile software available, handling any possible kind of single and team competitions, ensuring data integrity over the whole competition and providing a maximum of automatation to the admin and information-rich live results to the world. The only requirement for users is a modern browser on their phone, tablet or computer, since LiveAthletics runs on a webserver (Node.js). LiveAthletics shall be open-source, so that everybody can contribute to the project and create personal adaptions.

A relational database (MariaDB/MySQL) ensures the integrity of the data in liveAthletics, while MongoDB is used for object-like and independent data. 

Up and running: 
- the whole technical basis to keep every client (and server) always up-to-date without reload (via websockets)
- load balacing with any number of secondary servers, which replicate the data automatically and provide it to their clients
- event grouping
- any number of rounds
- splitting event(groups) into any number of groups (both for combined events as well as single events)
- flexible seeding
- vertical technical events (high jump and pole vault)
- track events (including automatic and live exchange with timing softwares*) (* currently only ALGE is supported, but further implementations are easily possible, since the main logic is in a base class to inhereit from)
- horizontal technical events (all throws, long jump and triple jump) [partially in development]
- qualification between rounds
- automatic exchange with national bodies (currently: swiss-athletics)
- backup and restoration to/from file

TODO:
- Login for Admins
- combined events
- team events
- centralized control over displays
- automatic input from electronic distance measurement and wind measurement
- payment control + receipt module
- many more optional ideas

It currently is a one-person-hobby-project, but support is highly appreciated. 
