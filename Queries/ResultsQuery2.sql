Select
    seriesstartsresults.position,
    seriesstartsresults.resultOverrule,
    seriesstartsresults.resultRemark,
    seriesstartsresults.startConf,
    series.status as seriesStatus,
    series.name as seriesName,
    series.datetime,
    series.aux,
    series.number,
    regions.country,
    regions.regionShortname,
	contests.name as contestName,
	contests.status as contestStatus,
	contests.conf as contestConf,
    resultstrack.time,
    resultstrack.timeRounded,
    resultstrack.rank,
    resultstrack.reactionTime,
	resultstech.result,
	resultstech.attempt,
	resultstech.wind,
    heights.height,
    heights.jumpoffOrder,
    resultshigh.resultsHighFailedAttempts,
    resultshigh.resultsHighValid,
    resultshigh.resultsHighPassed,
    startsingroup.number As groupNumber,
    athletes.lastname,
    athletes.forename,
    athletes.birthdate,
    athletes.sex,
	athletes.identifier,
    clubs.name As clubName,
	clubs.usercode as usercode,
    inscriptions.number As bib,
    starts.bestPerf,
    starts.bestPerfLast,
    groups.name As groupName,
    bdlC.shortname as bdlCShortname,
    bdlC.name As bdlCName,
    basedisciplinesC.shortnameStd as bdCShortnameStd,
    basedisciplinesC.nameStd as bdCNameStd,
    basedisciplinesC.type as bdCType,
    basedisciplinesC.indoor as bdCIndoor,
	basedisciplinesC.baseConfiguration As bdCBaseConfiguration,
    events.onlineId,
	events.info as eventInfo,
	events.date,
	events.nationalBody,
	categories.shortname As catShortname,
    categories.name As catName,
	disciplines.configuration,
	disciplines.info as disciplineInfo,
    bdlE.name As bdlEName,
	bdlE.shortname As bdlEShortname,
    basedisciplinesE.nameStd As bdENameStd,
    basedisciplinesE.shortnameStd As bdEShortnameStd,
	basedisciplinesE.type As bdEType,
	basedisciplinesE.indoor As bdEIndoor,
	basedisciplinesE.baseConfiguration As bdEBaseConfiguration
From
    seriesstartsresults Inner Join
    series On seriesstartsresults.xSeries = series.xSeries Inner Join
    startsingroup On seriesstartsresults.xStartgroup = startsingroup.xStartgroup
    left Join
    starts On startsingroup.xStart = starts.xStart left Join
    inscriptions On starts.xInscription = inscriptions.xInscription left Join
    athletes On athletes.xInscription = inscriptions.xInscription Left Join
    regions On athletes.xRegion = regions.xRegion Left Join
    contests On series.xContest = contests.xContest left Join
    resultshigh On resultshigh.xResult = seriesstartsresults.xSeriesStart Left Join
    resultstech On resultstech.xResultTech = seriesstartsresults.xSeriesStart Left Join
    resultstrack On resultstrack.xResultTrack = seriesstartsresults.xSeriesStart Left Join
    heights On resultshigh.xHeight = heights.xHeight Left Join
    clubs On athletes.xClub = clubs.xClub Left Join
    groups On groups.xContest = contests.xContest Left Join
    rounds On groups.xRound = rounds.xRound Left Join
    eventgroups On rounds.xEventGroup = eventgroups.xEventGroup Left Join
    basedisciplines basedisciplinesC On contests.xBaseDiscipline = basedisciplinesC.xBaseDiscipline
    Left Join (select shortname, name, xBaseDiscipline from basedisciplinelocalizations where language='de') bdlC
    On bdlC.xBaseDiscipline =
            basedisciplinesC.xBaseDiscipline Left Join
    events On starts.xEvent = events.xEvent Left Join
    categories On events.xCategory = categories.xCategory Left Join
    disciplines On events.xDiscipline = disciplines.xDiscipline Left Join
    basedisciplines basedisciplinesE On disciplines.xBaseDiscipline =
            basedisciplinesE.xBaseDiscipline Left Join
    (select shortname, name, xBaseDiscipline from basedisciplinelocalizations where language='de') bdlE On bdlE.xBaseDiscipline =
            basedisciplinesE.xBaseDiscipline
Where
    athletes.nationalBody='SUI' AND
	contests.status>=180 -- TODO: only competitions that are at least finished!
order by
	eventgroups.xEventGroup, -- must be ordered by eventGroup, round, group and series first to make the ranking-stuff work
	rounds.order,
	groups.number,
	series.number,
	heights.jumpoffOrder, -- sort the results
	heights.height,
	resultstech.attempt