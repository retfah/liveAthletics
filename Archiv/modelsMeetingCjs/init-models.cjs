var DataTypes = require("sequelize").DataTypes;
var _athletes = require("./athletes");
var _categories = require("./categories");
var _clubs = require("./clubs");
var _competitions = require("./competitions");
var _contest = require("./contest");
var _contest_high = require("./contest_high");
var _contest_tech = require("./contest_tech");
var _contest_track = require("./contest_track");
var _conversionparams = require("./conversionparams");
var _conversions = require("./conversions");
var _countries = require("./countries");
var _disciplines = require("./disciplines");
var _disciplineslocalizations = require("./disciplineslocalizations");
var _disciplinesonsite = require("./disciplinesonsite");
var _eventgroup = require("./eventgroup");
var _events = require("./events");
var _groups = require("./groups");
var _heightincreases = require("./heightincreases");
var _heights = require("./heights");
var _inscriptions = require("./inscriptions");
var _meetings = require("./meetings");
var _modules = require("./modules");
var _regions = require("./regions");
var _relayathletepositions = require("./relayathletepositions");
var _relays = require("./relays");
var _relaysathletes = require("./relaysathletes");
var _resultshigh = require("./resultshigh");
var _resultstech = require("./resultstech");
var _resultstechwind = require("./resultstechwind");
var _resultstrack = require("./resultstrack");
var _rounds = require("./rounds");
var _series = require("./series");
var _series_track = require("./series_track");
var _seriesstarts_high = require("./seriesstarts_high");
var _seriesstarts_track = require("./seriesstarts_track");
var _seriesstartsresults = require("./seriesstartsresults");
var _sites = require("./sites");
var _sites_track = require("./sites_track");
var _startgroup = require("./startgroup");
var _starts = require("./starts");
var _teaminscriptions = require("./teaminscriptions");
var _teams = require("./teams");

function initModels(sequelize) {
  var athletes = _athletes(sequelize, DataTypes);
  var categories = _categories(sequelize, DataTypes);
  var clubs = _clubs(sequelize, DataTypes);
  var competitions = _competitions(sequelize, DataTypes);
  var contest = _contest(sequelize, DataTypes);
  var contest_high = _contest_high(sequelize, DataTypes);
  var contest_tech = _contest_tech(sequelize, DataTypes);
  var contest_track = _contest_track(sequelize, DataTypes);
  var conversionparams = _conversionparams(sequelize, DataTypes);
  var conversions = _conversions(sequelize, DataTypes);
  var countries = _countries(sequelize, DataTypes);
  var disciplines = _disciplines(sequelize, DataTypes);
  var disciplineslocalizations = _disciplineslocalizations(sequelize, DataTypes);
  var disciplinesonsite = _disciplinesonsite(sequelize, DataTypes);
  var eventgroup = _eventgroup(sequelize, DataTypes);
  var events = _events(sequelize, DataTypes);
  var groups = _groups(sequelize, DataTypes);
  var heightincreases = _heightincreases(sequelize, DataTypes);
  var heights = _heights(sequelize, DataTypes);
  var inscriptions = _inscriptions(sequelize, DataTypes);
  var meetings = _meetings(sequelize, DataTypes);
  var modules = _modules(sequelize, DataTypes);
  var regions = _regions(sequelize, DataTypes);
  var relayathletepositions = _relayathletepositions(sequelize, DataTypes);
  var relays = _relays(sequelize, DataTypes);
  var relaysathletes = _relaysathletes(sequelize, DataTypes);
  var resultshigh = _resultshigh(sequelize, DataTypes);
  var resultstech = _resultstech(sequelize, DataTypes);
  var resultstechwind = _resultstechwind(sequelize, DataTypes);
  var resultstrack = _resultstrack(sequelize, DataTypes);
  var rounds = _rounds(sequelize, DataTypes);
  var series = _series(sequelize, DataTypes);
  var series_track = _series_track(sequelize, DataTypes);
  var seriesstarts_high = _seriesstarts_high(sequelize, DataTypes);
  var seriesstarts_track = _seriesstarts_track(sequelize, DataTypes);
  var seriesstartsresults = _seriesstartsresults(sequelize, DataTypes);
  var sites = _sites(sequelize, DataTypes);
  var sites_track = _sites_track(sequelize, DataTypes);
  var startgroup = _startgroup(sequelize, DataTypes);
  var starts = _starts(sequelize, DataTypes);
  var teaminscriptions = _teaminscriptions(sequelize, DataTypes);
  var teams = _teams(sequelize, DataTypes);

  categories.belongsToMany(clubs, { through: relays, foreignKey: "xCategory", otherKey: "xClub" });
  clubs.belongsToMany(categories, { through: relays, foreignKey: "xClub", otherKey: "xCategory" });
  conversions.belongsToMany(disciplines, { through: conversionparams, foreignKey: "xConversion", otherKey: "xDiscipline" });
  disciplines.belongsToMany(conversions, { through: conversionparams, foreignKey: "xDiscipline", otherKey: "xConversion" });
  disciplines.belongsToMany(sites, { through: disciplinesonsite, foreignKey: "xDiscipline", otherKey: "xSite" });
  heights.belongsToMany(seriesstartsresults, { through: resultshigh, foreignKey: "xHeight", otherKey: "xResult" });
  inscriptions.belongsToMany(teams, { through: teaminscriptions, foreignKey: "xInscription", otherKey: "xTeam" });
  relaysathletes.belongsToMany(startgroup, { through: relayathletepositions, foreignKey: "xRelayAthlete", otherKey: "xStartgroup" });
  seriesstartsresults.belongsToMany(heights, { through: resultshigh, foreignKey: "xResult", otherKey: "xHeight" });
  sites.belongsToMany(disciplines, { through: disciplinesonsite, foreignKey: "xSite", otherKey: "xDiscipline" });
  startgroup.belongsToMany(relaysathletes, { through: relayathletepositions, foreignKey: "xStartgroup", otherKey: "xRelayAthlete" });
  teams.belongsToMany(inscriptions, { through: teaminscriptions, foreignKey: "xTeam", otherKey: "xInscription" });
  relaysathletes.belongsTo(athletes, { as: "xAthlete_athlete", foreignKey: "xAthlete"});
  athletes.hasMany(relaysathletes, { as: "relaysathletes", foreignKey: "xAthlete"});
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
  contest_high.belongsTo(contest, { as: "xContest_high_contest", foreignKey: "xContest_high"});
  contest.hasOne(contest_high, { as: "contest_high", foreignKey: "xContest_high"});
  contest_tech.belongsTo(contest, { as: "xContest_tech_contest", foreignKey: "xContest_tech"});
  contest.hasOne(contest_tech, { as: "contest_tech", foreignKey: "xContest_tech"});
  contest_track.belongsTo(contest, { as: "xContest_track_contest", foreignKey: "xContest_track"});
  contest.hasOne(contest_track, { as: "contest_track", foreignKey: "xContest_track"});
  groups.belongsTo(contest, { as: "contest_xContest_contest", foreignKey: "contest_xContest"});
  contest.hasMany(groups, { as: "groups", foreignKey: "contest_xContest"});
  series.belongsTo(contest, { as: "xContest_contest", foreignKey: "xContest"});
  contest.hasOne(series, { as: "series", foreignKey: "xContest"});
  heightincreases.belongsTo(contest_high, { as: "xRound_high_contest_high", foreignKey: "xRound_high"});
  contest_high.hasMany(heightincreases, { as: "heightincreases", foreignKey: "xRound_high"});
  conversionparams.belongsTo(conversions, { as: "xConversion_conversion", foreignKey: "xConversion"});
  conversions.hasMany(conversionparams, { as: "conversionparams", foreignKey: "xConversion"});
  contest.belongsTo(disciplines, { as: "xDiscipline_discipline", foreignKey: "xDiscipline"});
  disciplines.hasMany(contest, { as: "contests", foreignKey: "xDiscipline"});
  conversionparams.belongsTo(disciplines, { as: "xDiscipline_discipline", foreignKey: "xDiscipline"});
  disciplines.hasMany(conversionparams, { as: "conversionparams", foreignKey: "xDiscipline"});
  disciplineslocalizations.belongsTo(disciplines, { as: "xDiscipline_discipline", foreignKey: "xDiscipline"});
  disciplines.hasMany(disciplineslocalizations, { as: "disciplineslocalizations", foreignKey: "xDiscipline"});
  disciplinesonsite.belongsTo(disciplines, { as: "xDiscipline_discipline", foreignKey: "xDiscipline"});
  disciplines.hasMany(disciplinesonsite, { as: "disciplinesonsites", foreignKey: "xDiscipline"});
  eventgroup.belongsTo(disciplines, { as: "xDiscipline_discipline", foreignKey: "xDiscipline"});
  disciplines.hasMany(eventgroup, { as: "eventgroups", foreignKey: "xDiscipline"});
  events.belongsTo(disciplines, { as: "xDiscipline_discipline", foreignKey: "xDiscipline"});
  disciplines.hasMany(events, { as: "events", foreignKey: "xDiscipline"});
  events.belongsTo(eventgroup, { as: "xEventGroup_eventgroup", foreignKey: "xEventGroup"});
  eventgroup.hasMany(events, { as: "events", foreignKey: "xEventGroup"});
  rounds.belongsTo(eventgroup, { as: "xEventGroup_eventgroup", foreignKey: "xEventGroup"});
  eventgroup.hasMany(rounds, { as: "rounds", foreignKey: "xEventGroup"});
  starts.belongsTo(events, { as: "xEvent_event", foreignKey: "xEvent"});
  events.hasMany(starts, { as: "starts", foreignKey: "xEvent"});
  startgroup.belongsTo(groups, { as: "xGroup_group", foreignKey: "xGroup"});
  groups.hasMany(startgroup, { as: "startgroups", foreignKey: "xGroup"});
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
  relaysathletes.belongsTo(relays, { as: "xRelay_relay", foreignKey: "xRelay"});
  relays.hasMany(relaysathletes, { as: "relaysathletes", foreignKey: "xRelay"});
  relayathletepositions.belongsTo(relaysathletes, { as: "xRelayAthlete_relaysathlete", foreignKey: "xRelayAthlete"});
  relaysathletes.hasMany(relayathletepositions, { as: "relayathletepositions", foreignKey: "xRelayAthlete"});
  groups.belongsTo(rounds, { as: "rounds_xRound_round", foreignKey: "rounds_xRound"});
  rounds.hasMany(groups, { as: "groups", foreignKey: "rounds_xRound"});
  heights.belongsTo(series, { as: "xSeries_sery", foreignKey: "xSeries"});
  series.hasMany(heights, { as: "heights", foreignKey: "xSeries"});
  series_track.belongsTo(series, { as: "xSeries_track_sery", foreignKey: "xSeries_track"});
  series.hasOne(series_track, { as: "series_track", foreignKey: "xSeries_track"});
  seriesstartsresults.belongsTo(series, { as: "xSeries_sery", foreignKey: "xSeries"});
  series.hasOne(seriesstartsresults, { as: "seriesstartsresult", foreignKey: "xSeries"});
  resultshigh.belongsTo(seriesstartsresults, { as: "xResult_seriesstartsresult", foreignKey: "xResult"});
  seriesstartsresults.hasMany(resultshigh, { as: "resultshighs", foreignKey: "xResult"});
  resultstech.belongsTo(seriesstartsresults, { as: "xResult_seriesstartsresult", foreignKey: "xResult"});
  seriesstartsresults.hasMany(resultstech, { as: "resultsteches", foreignKey: "xResult"});
  resultstechwind.belongsTo(seriesstartsresults, { as: "xResult_seriesstartsresult", foreignKey: "xResult"});
  seriesstartsresults.hasMany(resultstechwind, { as: "resultstechwinds", foreignKey: "xResult"});
  resultstrack.belongsTo(seriesstartsresults, { as: "xResultTrack_seriesstartsresult", foreignKey: "xResultTrack"});
  seriesstartsresults.hasOne(resultstrack, { as: "resultstrack", foreignKey: "xResultTrack"});
  seriesstarts_high.belongsTo(seriesstartsresults, { as: "xSeriesStart_high_seriesstartsresult", foreignKey: "xSeriesStart_high"});
  seriesstartsresults.hasOne(seriesstarts_high, { as: "seriesstarts_high", foreignKey: "xSeriesStart_high"});
  seriesstarts_track.belongsTo(seriesstartsresults, { as: "xSeriesStart_track_seriesstartsresult", foreignKey: "xSeriesStart_track"});
  seriesstartsresults.hasOne(seriesstarts_track, { as: "seriesstarts_track", foreignKey: "xSeriesStart_track"});
  disciplinesonsite.belongsTo(sites, { as: "xSite_site", foreignKey: "xSite"});
  sites.hasMany(disciplinesonsite, { as: "disciplinesonsites", foreignKey: "xSite"});
  series.belongsTo(sites, { as: "xSite_site", foreignKey: "xSite"});
  sites.hasMany(series, { as: "series", foreignKey: "xSite"});
  sites.belongsTo(sites_track, { as: "xSite_sites_track", foreignKey: "xSite"});
  sites_track.hasOne(sites, { as: "site", foreignKey: "xSite"});
  relayathletepositions.belongsTo(startgroup, { as: "xStartgroup_startgroup", foreignKey: "xStartgroup"});
  startgroup.hasMany(relayathletepositions, { as: "relayathletepositions", foreignKey: "xStartgroup"});
  seriesstartsresults.belongsTo(startgroup, { as: "xStartgroup_startgroup", foreignKey: "xStartgroup"});
  startgroup.hasOne(seriesstartsresults, { as: "seriesstartsresult", foreignKey: "xStartgroup"});
  startgroup.belongsTo(starts, { as: "xStart_start", foreignKey: "xStart"});
  starts.hasOne(startgroup, { as: "startgroup", foreignKey: "xStart"});
  teaminscriptions.belongsTo(teams, { as: "xTeam_team", foreignKey: "xTeam"});
  teams.hasMany(teaminscriptions, { as: "teaminscriptions", foreignKey: "xTeam"});

  return {
    athletes,
    categories,
    clubs,
    competitions,
    contest,
    contest_high,
    contest_tech,
    contest_track,
    conversionparams,
    conversions,
    countries,
    disciplines,
    disciplineslocalizations,
    disciplinesonsite,
    eventgroup,
    events,
    groups,
    heightincreases,
    heights,
    inscriptions,
    meetings,
    modules,
    regions,
    relayathletepositions,
    relays,
    relaysathletes,
    resultshigh,
    resultstech,
    resultstechwind,
    resultstrack,
    rounds,
    series,
    series_track,
    seriesstarts_high,
    seriesstarts_track,
    seriesstartsresults,
    sites,
    sites_track,
    startgroup,
    starts,
    teaminscriptions,
    teams,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
