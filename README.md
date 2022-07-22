# liveAthletics
athletics / track and field competition management software

This software is under developement. 

In the final version, liveAthletics will provide all funcctionality needed to manage large competitions, including the competition management (entries, seeding, recording results, quelifications, result views, team events, combined events, groups, automatic backup+replication) as well as traffic-saving live results for thousands of clients (via websockets). Any change of data is instantly broadcasted to all clients that depend on this data. Multiple-servers are kept up-to-date automatically, which allows load balancing and automatic back-up. 

LiveAthletics shall be the most flexible software on the market, handling any possible kind of single and team competitions, ensuring data integrity over the whole competition and providing a maximum of automatation to the admin and information-rich live results to the world. The only requirement for users is a modern browser on their phone, tablet or computer, since LiveAthletics runs on a webserver (Node.js). LiveAthletics shall be open-source, so that everybody can contribute to the project and create personal adaptions.

A relational database (MariaDB/MySQL) ensures the integrity of the data in liveAthletics, while MongoDB is used for object-like and independent data. 

Up and running: 
- the whole technical basis to keep every client (and server) always up-to-date without reload (via websockets)
- load balacing with any number of secondary servers, which replicate the data automatically and provide it to their clients
- event grouping
- any number of rounds
- splitting event(groups) into any number of groups (both for combined events as well as single events)
- flexible seeding
- vertical technical events (high jump and pole vault)
- automatic exchange with national bodies (currently: swiss-athletics)
- backup and restoration to/from file

TODO:
- track events (including automatic and live exchange with timing softwares)
- horizontal technical events (all throws, long jump and triple jump)
- qualification between rounds
- combined events
- team events
- many more optional ideas

It currently is a one-person-hobby-project, but support especially when it comes to css-design is highly appreciated. 
