Select
    a2bbahm23.seriesstartsresults.position,
    a2bbahm23.seriesstartsresults.resultOverrule,
    a2bbahm23.seriesstartsresults.resultRemark,
    a2bbahm23.seriesstartsresults.startConf,
    a2bbahm23.series.status,
    a2bbahm23.series.name,
    a2bbahm23.series.datetime,
    a2bbahm23.series.aux,
    a2bbahm23.series.number,
    a2bbahm23.regions.country,
    a2bbahm23.regions.regionShortname,
    a2bbahm23.resultstrack.time,
    a2bbahm23.resultstrack.timeRounded,
    a2bbahm23.resultstrack.rank,
    a2bbahm23.resultstrack.reactionTime,
    a2bbahm23.heights.height,
    a2bbahm23.heights.jumpoffOrder,
    a2bbahm23.resultshigh.resultsHighFailedAttempts,
    a2bbahm23.resultshigh.resultsHighValid,
    a2bbahm23.resultshigh.resultsHighPassed,
    a2bbahm23.startsingroup.number As number1,
    a2bbahm23.athletes.lastname,
    a2bbahm23.athletes.forename,
    a2bbahm23.athletes.birthdate,
    a2bbahm23.athletes.sex,
    a2bbahm23.clubs.name As name1,
    a2bbahm23.inscriptions.number As number2,
    a2bbahm23.starts.bestPerf,
    a2bbahm23.starts.bestPerfLast,
    a2bbahm23.groups.name As name2,
    a2bbahm23.basedisciplinelocalizations.shortname,
    a2bbahm23.basedisciplinelocalizations.name As name3,
    a2bbahm23.basedisciplines.shortnameStd,
    a2bbahm23.basedisciplines.nameStd,
    a2bbahm23.basedisciplines.type,
    a2bbahm23.categories.shortname As shortname1,
    a2bbahm23.categories.name As name4,
    basedisciplinelocalizations1.name As name5,
    basedisciplines1.nameStd As nameStd1,
    basedisciplines1.shortnameStd As shortnameStd1,
    a2bbahm23.resultstech.result,
    a2bbahm23.resultstech.attempt,
    a2bbahm23.resultstech.wind,
    a2bbahm23.contests.status As status1,
    a2bbahm23.contests.name As name6,
    a2bbahm23.contests.conf
From
    a2bbahm23.seriesstartsresults Inner Join
    a2bbahm23.series On a2bbahm23.seriesstartsresults.xSeries = a2bbahm23.series.xSeries Inner Join
    a2bbahm23.startsingroup On a2bbahm23.seriesstartsresults.xStartgroup = a2bbahm23.startsingroup.xStartgroup
    Inner Join
    a2bbahm23.starts On a2bbahm23.startsingroup.xStart = a2bbahm23.starts.xStart Inner Join
    a2bbahm23.inscriptions On a2bbahm23.starts.xInscription = a2bbahm23.inscriptions.xInscription Inner Join
    a2bbahm23.athletes On a2bbahm23.athletes.xInscription = a2bbahm23.inscriptions.xInscription Left Join
    a2bbahm23.regions On a2bbahm23.athletes.xRegion = a2bbahm23.regions.xRegion Left Join
    a2bbahm23.contests On a2bbahm23.series.xContest = a2bbahm23.contests.xContest Left Join
    a2bbahm23.resultshigh On a2bbahm23.resultshigh.xResult = a2bbahm23.seriesstartsresults.xSeriesStart Left Join
    a2bbahm23.resultstrack On a2bbahm23.resultstrack.xResultTrack = a2bbahm23.seriesstartsresults.xSeriesStart Left Join
    a2bbahm23.heights On a2bbahm23.resultshigh.xHeight = a2bbahm23.heights.xHeight Left Join
    a2bbahm23.clubs On a2bbahm23.athletes.xClub = a2bbahm23.clubs.xClub Left Join
    a2bbahm23.groups On a2bbahm23.groups.xContest = a2bbahm23.contests.xContest Left Join
    a2bbahm23.rounds On a2bbahm23.groups.xRound = a2bbahm23.rounds.xRound Left Join
    a2bbahm23.eventgroups On a2bbahm23.rounds.xEventGroup = a2bbahm23.eventgroups.xEventGroup Left Join
    a2bbahm23.basedisciplines On a2bbahm23.contests.xBaseDiscipline = a2bbahm23.basedisciplines.xBaseDiscipline
    Left Join
    a2bbahm23.basedisciplinelocalizations On a2bbahm23.basedisciplinelocalizations.xBaseDiscipline =
            a2bbahm23.basedisciplines.xBaseDiscipline Left Join
    a2bbahm23.events On a2bbahm23.starts.xEvent = a2bbahm23.events.xEvent Left Join
    a2bbahm23.categories On a2bbahm23.events.xCategory = a2bbahm23.categories.xCategory Left Join
    a2bbahm23.disciplines On a2bbahm23.events.xDiscipline = a2bbahm23.disciplines.xDiscipline Left Join
    a2bbahm23.basedisciplines basedisciplines1 On a2bbahm23.disciplines.xBaseDiscipline =
            basedisciplines1.xBaseDiscipline Left Join
    a2bbahm23.basedisciplinelocalizations basedisciplinelocalizations1 On basedisciplinelocalizations1.xBaseDiscipline =
            basedisciplines1.xBaseDiscipline Inner Join
    a2bbahm23.resultstech On a2bbahm23.resultstech.xResultTech = a2bbahm23.seriesstartsresults.xSeriesStart
Where
    a2bbahm23.basedisciplinelocalizations.`language` = 'de'