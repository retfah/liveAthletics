import _sequelize from "sequelize";
const DataTypes = _sequelize.DataTypes;
import _athletes from  "./athletes.js";
import _categories from  "./categories.js";
import _clubs from  "./clubs.js";
import _competitions from  "./competitions.js";
import _contest from  "./contest.js";
import _contest_high from  "./contest_high.js";
import _contest_tech from  "./contest_tech.js";
import _contest_track from  "./contest_track.js";
import _conversionparams from  "./conversionparams.js";
import _conversions from  "./conversions.js";
import _countries from  "./countries.js";
import _disciplines from  "./disciplines.js";
import _disciplineslocalizations from  "./disciplineslocalizations.js";
import _disciplinesonsite from  "./disciplinesonsite.js";
import _eventgroup from  "./eventgroup.js";
import _events from  "./events.js";
import _groups from  "./groups.js";
import _heightincreases from  "./heightincreases.js";
import _heights from  "./heights.js";
import _inscriptions from  "./inscriptions.js";
import _meetings from  "./meetings.js";
import _modules from  "./modules.js";
import _regions from  "./regions.js";
import _relayathletepositions from  "./relayathletepositions.js";
import _relays from  "./relays.js";
import _relaysathletes from  "./relaysathletes.js";
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
import _startgroup from  "./startgroup.js";
import _starts from  "./starts.js";
import _teaminscriptions from  "./teaminscriptions.js";
import _teams from  "./teams.js";

export default function initModels(sequelize) {
  var athletes = _athletes.init(sequelize, DataTypes);
  var categories = _categories.init(sequelize, DataTypes);
  var clubs = _clubs.init(sequelize, DataTypes);
  var competitions = _competitions.init(sequelize, DataTypes);
  var contest = _contest.init(sequelize, DataTypes);
  var contest_high = _contest_high.init(sequelize, DataTypes);
  var contest_tech = _contest_tech.init(sequelize, DataTypes);
  var contest_track = _contest_track.init(sequelize, DataTypes);
  var conversionparams = _conversionparams.init(sequelize, DataTypes);
  var conversions = _conversions.init(sequelize, DataTypes);
  var countries = _countries.init(sequelize, DataTypes);
  var disciplines = _disciplines.init(sequelize, DataTypes);
  var disciplineslocalizations = _disciplineslocalizations.init(sequelize, DataTypes);
  var disciplinesonsite = _disciplinesonsite.init(sequelize, DataTypes);
  var eventgroup = _eventgroup.init(sequelize, DataTypes);
  var events = _events.init(sequelize, DataTypes);
  var groups = _groups.init(sequelize, DataTypes);
  var heightincreases = _heightincreases.init(sequelize, DataTypes);
  var heights = _heights.init(sequelize, DataTypes);
  var inscriptions = _inscriptions.init(sequelize, DataTypes);
  var meetings = _meetings.init(sequelize, DataTypes);
  var modules = _modules.init(sequelize, DataTypes);
  var regions = _regions.init(sequelize, DataTypes);
  var relayathletepositions = _relayathletepositions.init(sequelize, DataTypes);
  var relays = _relays.init(sequelize, DataTypes);
  var relaysathletes = _relaysathletes.init(sequelize, DataTypes);
  var resultshigh = _resultshigh.init(sequelize, DataTypes);
  var resultstech = _resultstech.init(sequelize, DataTypes);
  var resultstechwind = _resultstechwind.init(sequelize, DataTypes);
  var resultstrack = _resultstrack.init(sequelize, DataTypes);
  var rounds = _rounds.init(sequelize, DataTypes);
  var series = _series.init(sequelize, DataTypes);
  var series_track = _series_track.init(sequelize, DataTypes);
  var seriesstarts_high = _seriesstarts_high.init(sequelize, DataTypes);
  var seriesstarts_track = _seriesstarts_track.init(sequelize, DataTypes);
  var seriesstartsresults = _seriesstartsresults.init(sequelize, DataTypes);
  var sites = _sites.init(sequelize, DataTypes);
  var sites_track = _sites_track.init(sequelize, DataTypes);
  var startgroup = _startgroup.init(sequelize, DataTypes);
  var starts = _starts.init(sequelize, DataTypes);
  var teaminscriptions = _teaminscriptions.init(sequelize, DataTypes);
  var teams = _teams.init(sequelize, DataTypes);

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
