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
import _meetings from  "./meetings.js";
import _modules from  "./modules.js";
import _regions from  "./regions.js";
import _relayathletepositions from  "./relayathletepositions.js";
import _relayathletes from  "./relayathletes.js";
import _relays from  "./relays.js";
import _resultshigh from  "./resultshigh.js";
import _resultstech from  "./resultstech.js";
import _resultstechwind from  "./resultstechwind.js";
import _resultstrack from  "./resultstrack.js";
import _rounds from  "./rounds.js";
import _series from  "./series.js";
import _series_track from  "./series_track.js";
import _seriesstarts_high from  "./seriesstarts_high.js";
import _seriesstarts_track from  "./seriesstarts_track.js";
import _seriesstartsresults from  "./seriesstartsresults.js";
import _sites from  "./sites.js";
import _sites_track from  "./sites_track.js";
import _starts from  "./starts.js";
import _startsingroup from  "./startsingroup.js";
import _teaminscriptions from  "./teaminscriptions.js";
import _teams from  "./teams.js";

export default function initModels(sequelize) {
  var athletes = _athletes(sequelize, DataTypes);
  var basedisciplinelocalizations = _basedisciplinelocalizations(sequelize, DataTypes);
  var basedisciplines = _basedisciplines(sequelize, DataTypes);
  var categories = _categories(sequelize, DataTypes);
  var clubs = _clubs(sequelize, DataTypes);
  var combinedevents = _combinedevents(sequelize, DataTypes);
  var competitions = _competitions(sequelize, DataTypes);
  var contest_high = _contest_high(sequelize, DataTypes);
  var contests = _contests(sequelize, DataTypes);
  var contests_tech = _contests_tech(sequelize, DataTypes);
  var contests_track = _contests_track(sequelize, DataTypes);
  var conversionparams = _conversionparams(sequelize, DataTypes);
  var conversions = _conversions(sequelize, DataTypes);
  var countries = _countries(sequelize, DataTypes);
  var disciplines = _disciplines(sequelize, DataTypes);
  var disciplinesonsite = _disciplinesonsite(sequelize, DataTypes);
  var eventgroups = _eventgroups(sequelize, DataTypes);
  var events = _events(sequelize, DataTypes);
  var groups = _groups(sequelize, DataTypes);
  var heightincreases = _heightincreases(sequelize, DataTypes);
  var heights = _heights(sequelize, DataTypes);
  var inscriptions = _inscriptions(sequelize, DataTypes);
  var meetings = _meetings(sequelize, DataTypes);
  var modules = _modules(sequelize, DataTypes);
  var regions = _regions(sequelize, DataTypes);
  var relayathletepositions = _relayathletepositions(sequelize, DataTypes);
  var relayathletes = _relayathletes(sequelize, DataTypes);
  var relays = _relays(sequelize, DataTypes);
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
  var starts = _starts(sequelize, DataTypes);
  var startsingroup = _startsingroup(sequelize, DataTypes);
  var teaminscriptions = _teaminscriptions(sequelize, DataTypes);
  var teams = _teams(sequelize, DataTypes);

  categories.belongsToMany(clubs, { through: relays, foreignKey: "xCategory", otherKey: "xClub" });
  clubs.belongsToMany(categories, { through: relays, foreignKey: "xClub", otherKey: "xCategory" });
  conversions.belongsToMany(disciplines, { through: conversionparams, foreignKey: "xConversion", otherKey: "xDiscipline" });
  disciplines.belongsToMany(conversions, { through: conversionparams, foreignKey: "xDiscipline", otherKey: "xConversion" });
  heights.belongsToMany(seriesstartsresults, { through: resultshigh, foreignKey: "xHeight", otherKey: "xResult" });
  inscriptions.belongsToMany(teams, { through: teaminscriptions, foreignKey: "xInscription", otherKey: "xTeam" });
  relayathletes.belongsToMany(startsingroup, { through: relayathletepositions, foreignKey: "xRelayAthlete", otherKey: "xStartgroup" });
  seriesstartsresults.belongsToMany(heights, { through: resultshigh, foreignKey: "xResult", otherKey: "xHeight" });
  startsingroup.belongsToMany(relayathletes, { through: relayathletepositions, foreignKey: "xStartgroup", otherKey: "xRelayAthlete" });
  teams.belongsToMany(inscriptions, { through: teaminscriptions, foreignKey: "xTeam", otherKey: "xInscription" });
  relayathletes.belongsTo(athletes, { as: "xAthlete_athlete", foreignKey: "xAthlete"});
  athletes.hasMany(relayathletes, { as: "relayathletes", foreignKey: "xAthlete"});
  basedisciplinelocalizations.belongsTo(basedisciplines, { as: "xBaseDiscipline_basediscipline", foreignKey: "xBaseDiscipline"});
  basedisciplines.hasMany(basedisciplinelocalizations, { as: "basedisciplinelocalizations", foreignKey: "xBaseDiscipline"});
  contests.belongsTo(basedisciplines, { as: "xBaseDiscipline_basediscipline", foreignKey: "xBaseDiscipline"});
  basedisciplines.hasMany(contests, { as: "contests", foreignKey: "xBaseDiscipline"});
  disciplines.belongsTo(basedisciplines, { as: "xBaseDiscipline_basediscipline", foreignKey: "xBaseDiscipline"});
  basedisciplines.hasMany(disciplines, { as: "disciplines", foreignKey: "xBaseDiscipline"});
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
  contests.hasMany(series, { as: "series", foreignKey: "xContest"});
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
  series_track.belongsTo(series, { as: "xSeries_sery", foreignKey: "xSeries"});
  series.hasOne(series_track, { as: "series_track", foreignKey: "xSeries"});
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
    meetings,
    modules,
    regions,
    relayathletepositions,
    relayathletes,
    relays,
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
    starts,
    startsingroup,
    teaminscriptions,
    teams,
  };
}
