import _sequelize from "sequelize";
const DataTypes = _sequelize.DataTypes;
import _athletes from  "./athletes.js";
import _basedisciplinelocalizations from  "./basedisciplinelocalizations.js";
import _basedisciplines from  "./basedisciplines.js";
import _categories from  "./categories.js";
import _clubs from  "./clubs.js";
import _combinedevents from  "./combinedevents.js";
import _competitions from  "./competitions.js";
import _contest_high from  "./contest_high.js";
import _contests from  "./contests.js";
import _contests_tech from  "./contests_tech.js";
import _contests_track from  "./contests_track.js";
import _conversionparams from  "./conversionparams.js";
import _conversions from  "./conversions.js";
import _countries from  "./countries.js";
import _disciplines from  "./disciplines.js";
import _disciplinesonsite from  "./disciplinesonsite.js";
import _eventgroups from  "./eventgroups.js";
import _events from  "./events.js";
import _groups from  "./groups.js";
import _heightincreases from  "./heightincreases.js";
import _heights from  "./heights.js";
import _inscriptions from  "./inscriptions.js";
import _modules from  "./modules.js";
import _regions from  "./regions.js";
import _relayathletepositions from  "./relayathletepositions.js";
import _relayathletes from  "./relayathletes.js";
import _relays from  "./relays.js";
import _resultshigh from  "./resultshigh.js";
import _resultstech from  "./resultstech.js";
import _resultstrack from  "./resultstrack.js";
import _rounds from  "./rounds.js";
import _series from  "./series.js";
import _seriesstartsresults from  "./seriesstartsresults.js";
import _seriestrack from  "./seriestrack.js";
import _sites from  "./sites.js";
import _sites_track from  "./sites_track.js";
import _starts from  "./starts.js";
import _startsingroup from  "./startsingroup.js";
import _teaminscriptions from  "./teaminscriptions.js";
import _teams from  "./teams.js";

export default function initModels(sequelize) {
  const athletes = _athletes.init(sequelize, DataTypes);
  const basedisciplinelocalizations = _basedisciplinelocalizations.init(sequelize, DataTypes);
  const basedisciplines = _basedisciplines.init(sequelize, DataTypes);
  const categories = _categories.init(sequelize, DataTypes);
  const clubs = _clubs.init(sequelize, DataTypes);
  const combinedevents = _combinedevents.init(sequelize, DataTypes);
  const competitions = _competitions.init(sequelize, DataTypes);
  const contest_high = _contest_high.init(sequelize, DataTypes);
  const contests = _contests.init(sequelize, DataTypes);
  const contests_tech = _contests_tech.init(sequelize, DataTypes);
  const contests_track = _contests_track.init(sequelize, DataTypes);
  const conversionparams = _conversionparams.init(sequelize, DataTypes);
  const conversions = _conversions.init(sequelize, DataTypes);
  const countries = _countries.init(sequelize, DataTypes);
  const disciplines = _disciplines.init(sequelize, DataTypes);
  const disciplinesonsite = _disciplinesonsite.init(sequelize, DataTypes);
  const eventgroups = _eventgroups.init(sequelize, DataTypes);
  const events = _events.init(sequelize, DataTypes);
  const groups = _groups.init(sequelize, DataTypes);
  const heightincreases = _heightincreases.init(sequelize, DataTypes);
  const heights = _heights.init(sequelize, DataTypes);
  const inscriptions = _inscriptions.init(sequelize, DataTypes);
  const modules = _modules.init(sequelize, DataTypes);
  const regions = _regions.init(sequelize, DataTypes);
  const relayathletepositions = _relayathletepositions.init(sequelize, DataTypes);
  const relayathletes = _relayathletes.init(sequelize, DataTypes);
  const relays = _relays.init(sequelize, DataTypes);
  const resultshigh = _resultshigh.init(sequelize, DataTypes);
  const resultstech = _resultstech.init(sequelize, DataTypes);
  const resultstrack = _resultstrack.init(sequelize, DataTypes);
  const rounds = _rounds.init(sequelize, DataTypes);
  const series = _series.init(sequelize, DataTypes);
  const seriesstartsresults = _seriesstartsresults.init(sequelize, DataTypes);
  const seriestrack = _seriestrack.init(sequelize, DataTypes);
  const sites = _sites.init(sequelize, DataTypes);
  const sites_track = _sites_track.init(sequelize, DataTypes);
  const starts = _starts.init(sequelize, DataTypes);
  const startsingroup = _startsingroup.init(sequelize, DataTypes);
  const teaminscriptions = _teaminscriptions.init(sequelize, DataTypes);
  const teams = _teams.init(sequelize, DataTypes);

  basedisciplines.belongsToMany(sites, { as: 'xSite_sites', through: disciplinesonsite, foreignKey: "xBaseDiscipline", otherKey: "xSite" });
  categories.belongsToMany(clubs, { as: 'xClub_clubs', through: relays, foreignKey: "xCategory", otherKey: "xClub" });
  clubs.belongsToMany(categories, { as: 'xCategory_categories', through: relays, foreignKey: "xClub", otherKey: "xCategory" });
  conversions.belongsToMany(disciplines, { as: 'xDiscipline_disciplines', through: conversionparams, foreignKey: "xConversion", otherKey: "xDiscipline" });
  disciplines.belongsToMany(conversions, { as: 'xConversion_conversions', through: conversionparams, foreignKey: "xDiscipline", otherKey: "xConversion" });
  heights.belongsToMany(seriesstartsresults, { as: 'xResult_seriesstartsresults', through: resultshigh, foreignKey: "xHeight", otherKey: "xResult" });
  inscriptions.belongsToMany(teams, { as: 'xTeam_teams', through: teaminscriptions, foreignKey: "xInscription", otherKey: "xTeam" });
  relayathletes.belongsToMany(startsingroup, { as: 'xStartgroup_startsingroups', through: relayathletepositions, foreignKey: "xRelayAthlete", otherKey: "xStartgroup" });
  seriesstartsresults.belongsToMany(heights, { as: 'xHeight_heights', through: resultshigh, foreignKey: "xResult", otherKey: "xHeight" });
  sites.belongsToMany(basedisciplines, { as: 'xBaseDiscipline_basedisciplines', through: disciplinesonsite, foreignKey: "xSite", otherKey: "xBaseDiscipline" });
  startsingroup.belongsToMany(relayathletes, { as: 'xRelayAthlete_relayathletes', through: relayathletepositions, foreignKey: "xStartgroup", otherKey: "xRelayAthlete" });
  teams.belongsToMany(inscriptions, { as: 'xInscription_inscriptions', through: teaminscriptions, foreignKey: "xTeam", otherKey: "xInscription" });
  relayathletes.belongsTo(athletes, { as: "xAthlete_athlete", foreignKey: "xAthlete"});
  athletes.hasMany(relayathletes, { as: "relayathletes", foreignKey: "xAthlete"});
  basedisciplinelocalizations.belongsTo(basedisciplines, { as: "xBaseDiscipline_basediscipline", foreignKey: "xBaseDiscipline"});
  basedisciplines.hasMany(basedisciplinelocalizations, { as: "basedisciplinelocalizations", foreignKey: "xBaseDiscipline"});
  contests.belongsTo(basedisciplines, { as: "xBaseDiscipline_basediscipline", foreignKey: "xBaseDiscipline"});
  basedisciplines.hasMany(contests, { as: "contests", foreignKey: "xBaseDiscipline"});
  disciplines.belongsTo(basedisciplines, { as: "xBaseDiscipline_basediscipline", foreignKey: "xBaseDiscipline"});
  basedisciplines.hasMany(disciplines, { as: "disciplines", foreignKey: "xBaseDiscipline"});
  disciplinesonsite.belongsTo(basedisciplines, { as: "xBaseDiscipline_basediscipline", foreignKey: "xBaseDiscipline"});
  basedisciplines.hasMany(disciplinesonsite, { as: "disciplinesonsites", foreignKey: "xBaseDiscipline"});
  combinedevents.belongsTo(categories, { as: "xCategory_category", foreignKey: "xCategory"});
  categories.hasMany(combinedevents, { as: "combinedevents", foreignKey: "xCategory"});
  events.belongsTo(categories, { as: "xCategory_category", foreignKey: "xCategory"});
  categories.hasMany(events, { as: "events", foreignKey: "xCategory"});
  inscriptions.belongsTo(categories, { as: "xCategory_category", foreignKey: "xCategory"});
  categories.hasMany(inscriptions, { as: "inscriptions", foreignKey: "xCategory"});
  relays.belongsTo(categories, { as: "xCategory_category", foreignKey: "xCategory"});
  categories.hasMany(relays, { as: "relays", foreignKey: "xCategory"});
  athletes.belongsTo(clubs, { as: "xClub_club", foreignKey: "xClub"});
  clubs.hasMany(athletes, { as: "athletes", foreignKey: "xClub"});
  relays.belongsTo(clubs, { as: "xClub_club", foreignKey: "xClub"});
  clubs.hasMany(relays, { as: "relays", foreignKey: "xClub"});
  teams.belongsTo(clubs, { as: "xClub_club", foreignKey: "xClub"});
  clubs.hasMany(teams, { as: "teams", foreignKey: "xClub"});
  teams.belongsTo(competitions, { as: "xCompetition_competition", foreignKey: "xCompetition"});
  competitions.hasMany(teams, { as: "teams", foreignKey: "xCompetition"});
  heightincreases.belongsTo(contest_high, { as: "xContest_contest_high", foreignKey: "xContest"});
  contest_high.hasMany(heightincreases, { as: "heightincreases", foreignKey: "xContest"});
  contest_high.belongsTo(contests, { as: "xContests_contest", foreignKey: "xContests"});
  contests.hasOne(contest_high, { as: "contest_high", foreignKey: "xContests"});
  contests_tech.belongsTo(contests, { as: "xContest_contest", foreignKey: "xContest"});
  contests.hasOne(contests_tech, { as: "contests_tech", foreignKey: "xContest"});
  contests_track.belongsTo(contests, { as: "xContest_contest", foreignKey: "xContest"});
  contests.hasOne(contests_track, { as: "contests_track", foreignKey: "xContest"});
  groups.belongsTo(contests, { as: "xContest_contest", foreignKey: "xContest"});
  contests.hasMany(groups, { as: "groups", foreignKey: "xContest"});
  series.belongsTo(contests, { as: "xContest_contest", foreignKey: "xContest"});
  contests.hasMany(series, { as: "seriess", foreignKey: "xContest"});
  combinedevents.belongsTo(conversions, { as: "xConversion_conversion", foreignKey: "xConversion"});
  conversions.hasMany(combinedevents, { as: "combinedevents", foreignKey: "xConversion"});
  conversionparams.belongsTo(conversions, { as: "xConversion_conversion", foreignKey: "xConversion"});
  conversions.hasMany(conversionparams, { as: "conversionparams", foreignKey: "xConversion"});
  conversionparams.belongsTo(disciplines, { as: "xDiscipline_discipline", foreignKey: "xDiscipline"});
  disciplines.hasMany(conversionparams, { as: "conversionparams", foreignKey: "xDiscipline"});
  eventgroups.belongsTo(disciplines, { as: "xDiscipline_discipline", foreignKey: "xDiscipline"});
  disciplines.hasMany(eventgroups, { as: "eventgroups", foreignKey: "xDiscipline"});
  events.belongsTo(disciplines, { as: "xDiscipline_discipline", foreignKey: "xDiscipline"});
  disciplines.hasMany(events, { as: "events", foreignKey: "xDiscipline"});
  events.belongsTo(eventgroups, { as: "xEventGroup_eventgroup", foreignKey: "xEventGroup"});
  eventgroups.hasMany(events, { as: "events", foreignKey: "xEventGroup"});
  rounds.belongsTo(eventgroups, { as: "xEventGroup_eventgroup", foreignKey: "xEventGroup"});
  eventgroups.hasMany(rounds, { as: "rounds", foreignKey: "xEventGroup"});
  starts.belongsTo(events, { as: "xEvent_event", foreignKey: "xEvent"});
  events.hasMany(starts, { as: "starts", foreignKey: "xEvent"});
  startsingroup.belongsTo(groups, { as: "xRound_group", foreignKey: "xRound"});
  groups.hasMany(startsingroup, { as: "startsingroups", foreignKey: "xRound"});
  startsingroup.belongsTo(groups, { as: "number_group", foreignKey: "number"});
  groups.hasMany(startsingroup, { as: "number_startsingroups", foreignKey: "number"});
  resultshigh.belongsTo(heights, { as: "xHeight_height", foreignKey: "xHeight"});
  heights.hasMany(resultshigh, { as: "resultshighs", foreignKey: "xHeight"});
  athletes.belongsTo(inscriptions, { as: "xInscription_inscription", foreignKey: "xInscription"});
  inscriptions.hasMany(athletes, { as: "athletes", foreignKey: "xInscription"});
  relays.belongsTo(inscriptions, { as: "xInscription_inscription", foreignKey: "xInscription"});
  inscriptions.hasMany(relays, { as: "relays", foreignKey: "xInscription"});
  starts.belongsTo(inscriptions, { as: "xInscription_inscription", foreignKey: "xInscription"});
  inscriptions.hasMany(starts, { as: "starts", foreignKey: "xInscription"});
  teaminscriptions.belongsTo(inscriptions, { as: "xInscription_inscription", foreignKey: "xInscription"});
  inscriptions.hasMany(teaminscriptions, { as: "teaminscriptions", foreignKey: "xInscription"});
  athletes.belongsTo(regions, { as: "xRegion_region", foreignKey: "xRegion"});
  regions.hasMany(athletes, { as: "athletes", foreignKey: "xRegion"});
  relays.belongsTo(regions, { as: "xRegion_region", foreignKey: "xRegion"});
  regions.hasMany(relays, { as: "relays", foreignKey: "xRegion"});
  relayathletepositions.belongsTo(relayathletes, { as: "xRelayAthlete_relayathlete", foreignKey: "xRelayAthlete"});
  relayathletes.hasMany(relayathletepositions, { as: "relayathletepositions", foreignKey: "xRelayAthlete"});
  relayathletes.belongsTo(relays, { as: "xRelay_relay", foreignKey: "xRelay"});
  relays.hasMany(relayathletes, { as: "relayathletes", foreignKey: "xRelay"});
  groups.belongsTo(rounds, { as: "xRound_round", foreignKey: "xRound"});
  rounds.hasMany(groups, { as: "groups", foreignKey: "xRound"});
  heights.belongsTo(series, { as: "xSeries_sery", foreignKey: "xSeries"});
  series.hasMany(heights, { as: "heights", foreignKey: "xSeries"});
  seriesstartsresults.belongsTo(series, { as: "xSeries_sery", foreignKey: "xSeries"});
  series.hasMany(seriesstartsresults, { as: "seriesstartsresults", foreignKey: "xSeries"});
  seriestrack.belongsTo(series, { as: "xSeries_sery", foreignKey: "xSeries"});
  series.hasOne(seriestrack, { as: "seriestrack", foreignKey: "xSeries"});
  resultshigh.belongsTo(seriesstartsresults, { as: "xResult_seriesstartsresult", foreignKey: "xResult"});
  seriesstartsresults.hasMany(resultshigh, { as: "resultshighs", foreignKey: "xResult"});
  resultstech.belongsTo(seriesstartsresults, { as: "xResult_seriesstartsresult", foreignKey: "xResult"});
  seriesstartsresults.hasMany(resultstech, { as: "resultsteches", foreignKey: "xResult"});
  resultstrack.belongsTo(seriesstartsresults, { as: "xResultTrack_seriesstartsresult", foreignKey: "xResultTrack"});
  seriesstartsresults.hasOne(resultstrack, { as: "resultstrack", foreignKey: "xResultTrack"});
  disciplinesonsite.belongsTo(sites, { as: "xSite_site", foreignKey: "xSite"});
  sites.hasMany(disciplinesonsite, { as: "disciplinesonsites", foreignKey: "xSite"});
  series.belongsTo(sites, { as: "xSite_site", foreignKey: "xSite"});
  sites.hasMany(series, { as: "seriess", foreignKey: "xSite"});
  sites_track.belongsTo(sites, { as: "xSite_site", foreignKey: "xSite"});
  sites.hasOne(sites_track, { as: "sites_track", foreignKey: "xSite"});
  startsingroup.belongsTo(starts, { as: "xStart_start", foreignKey: "xStart"});
  starts.hasMany(startsingroup, { as: "startsingroups", foreignKey: "xStart"});
  relayathletepositions.belongsTo(startsingroup, { as: "xStartgroup_startsingroup", foreignKey: "xStartgroup"});
  startsingroup.hasMany(relayathletepositions, { as: "relayathletepositions", foreignKey: "xStartgroup"});
  seriesstartsresults.belongsTo(startsingroup, { as: "xStartgroup_startsingroup", foreignKey: "xStartgroup"});
  startsingroup.hasOne(seriesstartsresults, { as: "seriesstartsresult", foreignKey: "xStartgroup"});
  teaminscriptions.belongsTo(teams, { as: "xTeam_team", foreignKey: "xTeam"});
  teams.hasMany(teaminscriptions, { as: "teaminscriptions", foreignKey: "xTeam"});

  return {
    athletes,
    basedisciplinelocalizations,
    basedisciplines,
    categories,
    clubs,
    combinedevents,
    competitions,
    contest_high,
    contests,
    contests_tech,
    contests_track,
    conversionparams,
    conversions,
    countries,
    disciplines,
    disciplinesonsite,
    eventgroups,
    events,
    groups,
    heightincreases,
    heights,
    inscriptions,
    modules,
    regions,
    relayathletepositions,
    relayathletes,
    relays,
    resultshigh,
    resultstech,
    resultstrack,
    rounds,
    series,
    seriesstartsresults,
    seriestrack,
    sites,
    sites_track,
    starts,
    startsingroup,
    teaminscriptions,
    teams,
  };
}
