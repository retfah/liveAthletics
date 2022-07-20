-- MariaDB dump 10.19  Distrib 10.6.5-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: a2nextTry
-- ------------------------------------------------------
-- Server version	10.6.5-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `athletes`
--

DROP TABLE IF EXISTS `athletes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `athletes` (
  `xAthlete` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `lastname` varchar(100) NOT NULL DEFAULT '',
  `forename` varchar(100) NOT NULL DEFAULT '',
  `birthdate` date NOT NULL DEFAULT '1900-01-01',
  `sex` enum('f','m') DEFAULT 'f',
  `xClub` int(10) unsigned NOT NULL,
  `identifier` varchar(36) DEFAULT NULL COMMENT 'varchar allows up to UUIDv4 and most integers',
  `nationalBody` char(3) DEFAULT NULL,
  `xRegion` int(10) unsigned NOT NULL,
  `xInscription` int(10) unsigned NOT NULL,
  PRIMARY KEY (`xAthlete`),
  UNIQUE KEY `uniqueBase` (`identifier`,`nationalBody`) COMMENT 'every athlete from base should only be once in the DB',
  KEY `fk_athlete_club1_idx` (`xClub`),
  KEY `fk_athlete_regions1_idx` (`xRegion`),
  KEY `fk_athletes_inscriptions1_idx` (`xInscription`),
  CONSTRAINT `fk_athlete_club1` FOREIGN KEY (`xClub`) REFERENCES `clubs` (`xClub`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_athlete_regions1` FOREIGN KEY (`xRegion`) REFERENCES `regions` (`xRegion`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_athletes_inscriptions1` FOREIGN KEY (`xInscription`) REFERENCES `inscriptions` (`xInscription`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=2015 DEFAULT CHARSET=utf8mb3 COMMENT='without license = manually entered\nnot included compared to old DB:\nAdress, Plz, Ort, Email, Athleticagen, bezahlt';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `athletes`
--

LOCK TABLES `athletes` WRITE;
/*!40000 ALTER TABLE `athletes` DISABLE KEYS */;
/*!40000 ALTER TABLE `athletes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `basedisciplinelocalizations`
--

DROP TABLE IF EXISTS `basedisciplinelocalizations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `basedisciplinelocalizations` (
  `xDisciplinesLocalization` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `xBaseDiscipline` int(10) unsigned NOT NULL,
  `language` char(2) NOT NULL COMMENT 'language shortcut according to ISO639-1: http://www.loc.gov/standards/iso639-2/php/code_list.php\n',
  `name` varchar(50) NOT NULL,
  `shortname` varchar(20) NOT NULL,
  PRIMARY KEY (`xDisciplinesLocalization`,`xBaseDiscipline`),
  UNIQUE KEY `onlyOne` (`xBaseDiscipline`,`language`),
  KEY `fk_baseDisciplineLocalizations_baseDisciplines1_idx` (`xBaseDiscipline`),
  CONSTRAINT `fk_baseDisciplineLocalizations_baseDisciplines1` FOREIGN KEY (`xBaseDiscipline`) REFERENCES `basedisciplines` (`xBaseDiscipline`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='stores the language dependet names of the disciplines';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `basedisciplinelocalizations`
--

LOCK TABLES `basedisciplinelocalizations` WRITE;
/*!40000 ALTER TABLE `basedisciplinelocalizations` DISABLE KEYS */;
/*!40000 ALTER TABLE `basedisciplinelocalizations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `basedisciplines`
--

DROP TABLE IF EXISTS `basedisciplines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `basedisciplines` (
  `xBaseDiscipline` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `type` tinyint(3) unsigned NOT NULL COMMENT 'an ID for the discipline module to use, e.g. run-in-lanes-wind, run-in-lanes-noWind, run-no-lanes, tech-long, tech-high. Using modules for the disciplines allows for flexibility with new disciplines, but it might add some difficulties, as the modules will hav eto implement their own tables, which means when activating/deactivating the module, the DB has to be changed!',
  `relay` bit(1) NOT NULL DEFAULT b'0' COMMENT 'relays are a special discipline since it requires multiple athletes and therefore has a separate inscription',
  `nameStd` varchar(50) NOT NULL DEFAULT '',
  `shortnameStd` varchar(20) NOT NULL DEFAULT '',
  `timeAppeal` time NOT NULL DEFAULT '00:00:00' COMMENT 'offset from the start time',
  `timeCall` time NOT NULL DEFAULT '00:00:00' COMMENT 'offset from the start time',
  PRIMARY KEY (`xBaseDiscipline`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3 COMMENT='the base discipline (e.g. shot put --> the discipline will then further specify';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `basedisciplines`
--

LOCK TABLES `basedisciplines` WRITE;
/*!40000 ALTER TABLE `basedisciplines` DISABLE KEYS */;
INSERT INTO `basedisciplines` VALUES (1,1,'\0','Pole vault','PV','01:30:00','01:00:00'),(2,1,'\0','High jump','HJ','01:00:00','00:40:00');
/*!40000 ALTER TABLE `basedisciplines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categories` (
  `xCategory` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `shortname` varchar(4) NOT NULL DEFAULT '',
  `name` varchar(30) NOT NULL DEFAULT '',
  `sortorder` int(10) unsigned NOT NULL DEFAULT 1,
  `ageMin` tinyint(3) unsigned NOT NULL DEFAULT 0 COMMENT 'from and including this age',
  `ageMax` tinyint(3) unsigned NOT NULL DEFAULT 99 COMMENT 'up to and including this age',
  `code` varchar(4) NOT NULL DEFAULT '',
  `sex` enum('m','f') NOT NULL DEFAULT 'f',
  `active` bit(1) NOT NULL DEFAULT b'1',
  PRIMARY KEY (`xCategory`),
  UNIQUE KEY `Kurzname` (`shortname`),
  KEY `Anzeige` (`sortorder`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb3 COMMENT='no UKC-Column';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'MAN','MAN',1,0,99,'MAN_','m',''),(2,'U20M','U20 M',4,0,99,'U20M','m',''),(3,'U18M','U18 M',5,0,99,'U18M','m',''),(4,'U16M','U16 M',6,0,99,'U16M','m',''),(5,'U14M','U14 M',7,0,99,'U14M','m',''),(6,'U12M','U12 M',8,0,99,'U12M','m',''),(7,'WOM','WOM',10,0,99,'WOM_','f',''),(8,'U20W','U20 W',13,0,99,'U20W','f',''),(9,'U18W','U18 W',14,0,99,'U18W','f',''),(10,'U16W','U16 W',15,0,99,'U16W','f',''),(11,'U14W','U14 W',16,0,99,'U14W','f',''),(12,'U12W','U12 W',17,0,99,'U12W','f',''),(13,'U23M','U23 M',3,0,99,'U23M','m',''),(14,'U23W','U23 W',12,0,99,'U23W','f',''),(16,'U10M','U10 M',9,0,99,'U10M','m',''),(17,'U10W','U10 W',18,0,99,'U10W','f',''),(18,'MASM','MASTERS M',2,0,99,'MASM','m',''),(19,'MASW','MASTERS W',11,0,99,'MASW','f',''),(20,'M15','U16 M15',21,0,99,'M15','m',''),(21,'M14','U16 M14',22,0,99,'M14','m',''),(22,'M13','U14 M13',23,0,99,'M13','m',''),(23,'M12','U14 M12',24,0,99,'M12','m',''),(24,'M11','U12 M11',25,0,99,'M11','m',''),(25,'M10','U12 M10',26,0,99,'M10','m',''),(26,'M09','U10 M09',27,0,99,'M09','m',''),(27,'M08','U10 M08',28,0,99,'M08','m',''),(28,'M07','U10 M07',29,0,99,'M07','m',''),(29,'W15','U16 W15',31,0,99,'W15','f',''),(30,'W14','U16 W14',32,0,99,'W14','f',''),(31,'W13','U14 W13',33,0,99,'W13','f',''),(32,'W12','U14 W12',34,0,99,'W12','f',''),(33,'W11','U12 W11',35,0,99,'W11','f',''),(34,'W10','U12 W10',36,0,99,'W10','f',''),(35,'W09','U10 W09',37,0,99,'W09','f',''),(36,'W08','U10 W08',38,0,99,'W08','f',''),(37,'W07','U10 W07',39,0,99,'W07','f',''),(38,'MIXE','Männer/Frauen Mixed',22,0,99,'MIXE','m',''),(39,'U18X','U18 Mixed',19,0,99,'U18X','m',''),(40,'U20X','U20 Mixed',20,0,99,'U20X','m',''),(41,'U23X','U23 Mixed',21,0,99,'U23X','m','');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clubs`
--

DROP TABLE IF EXISTS `clubs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `clubs` (
  `xClub` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL DEFAULT '',
  `sortvalue` varchar(100) NOT NULL DEFAULT '0',
  `usercode` varchar(30) NOT NULL DEFAULT '' COMMENT 'the username in the alabus database --> why do we need this?',
  `deleted` bit(1) NOT NULL DEFAULT b'0' COMMENT 'because clubs can not be delted as long as it is referenced --> do not ',
  PRIMARY KEY (`xClub`),
  UNIQUE KEY `Name` (`name`),
  KEY `Sortierwert` (`sortvalue`),
  KEY `xCode` (`usercode`)
) ENGINE=InnoDB AUTO_INCREMENT=644 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clubs`
--

LOCK TABLES `clubs` WRITE;
/*!40000 ALTER TABLE `clubs` DISABLE KEYS */;
INSERT INTO `clubs` VALUES (634,'Biel/Bienne Athletics','BBA','','\0'),(635,'LV Winterthur','LVW','','\0'),(636,'GG Bern','GGB','','\0'),(637,'LC Zürich','0','','\0'),(640,'Neuer Verein','Neuer Verein','','\0'),(641,'LC Adelboden','Adelboden, LC','','\0'),(642,'LC Bever','Bever, LC','','\0');
/*!40000 ALTER TABLE `clubs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `combinedevents`
--

DROP TABLE IF EXISTS `combinedevents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `combinedevents` (
  `xCombinedEvent` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `xCategory` int(10) unsigned NOT NULL,
  `name` varchar(50) NOT NULL DEFAULT '""',
  `type` tinyint(3) unsigned NOT NULL COMMENT 'here the type of the combinedEvent is stored (like 7-Kampf, 10-Kampf, custom) --> the disciplines that should be connected to this type are defined in a conf-file (but not mandatory for all combinedEventTypes, to allow custom combined Events)\ncustom = ...KAMPF',
  `xConversion` int(10) unsigned NOT NULL,
  PRIMARY KEY (`xCombinedEvent`),
  KEY `fk_event_conversion1_idx` (`xConversion`),
  KEY `fk_combinedEvents_categories1_idx` (`xCategory`),
  CONSTRAINT `fk_combinedEvents_categories1` FOREIGN KEY (`xCategory`) REFERENCES `categories` (`xCategory`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_event_conversion1` FOREIGN KEY (`xConversion`) REFERENCES `conversions` (`xConversion`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='this table is new in Athletica2\nMehrkampf\nwieso braucht es hier die Kategorie? ist redundant\ndie Competition ist redundant';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `combinedevents`
--

LOCK TABLES `combinedevents` WRITE;
/*!40000 ALTER TABLE `combinedevents` DISABLE KEYS */;
/*!40000 ALTER TABLE `combinedevents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `competitions`
--

DROP TABLE IF EXISTS `competitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `competitions` (
  `xCompetition` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `type` tinyint(3) unsigned NOT NULL DEFAULT 0 COMMENT 'die Art des "Wettkampfes"=der Wettkampftyp, zB: normal, SVM-LigaA, Kids-Cup, ... (Referenz wird als Nummer abgelegt)\nSMALLINT: damit es sicherlich immer reicht für alle Typen (65535 Werte möglich)',
  `name` varchar(100) NOT NULL DEFAULT '' COMMENT 'Name zur leichteren Identifikation, kann ev auf Anzeigen, Online oder auf den Wettkampfblättern gebruacht werden',
  `teamCompetition` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`xCompetition`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='defines diffrerent competitions (standard, SVM A, SVM B, team-SM, Kids-cup, etc.) which defines standard parameters for track-distribution-strategies, print-Setups, \n\nev hier noch Startgelder für Teams eingeben';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `competitions`
--

LOCK TABLES `competitions` WRITE;
/*!40000 ALTER TABLE `competitions` DISABLE KEYS */;
/*!40000 ALTER TABLE `competitions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contest_high`
--

DROP TABLE IF EXISTS `contest_high`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contest_high` (
  `xContests` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `jumpoff` tinyint(1) NOT NULL DEFAULT 0 COMMENT '=Stichkampf yes/no\ngeneraly only on championshiops, therefore the standard is no',
  PRIMARY KEY (`xContests`),
  CONSTRAINT `fk_contest_high_contest1` FOREIGN KEY (`xContests`) REFERENCES `contests` (`xContest`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contest_high`
--

LOCK TABLES `contest_high` WRITE;
/*!40000 ALTER TABLE `contest_high` DISABLE KEYS */;
/*!40000 ALTER TABLE `contest_high` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contests`
--

DROP TABLE IF EXISTS `contests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contests` (
  `xContest` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `xBaseDiscipline` int(10) unsigned NOT NULL COMMENT 'Decision',
  `datetimeAppeal` datetime NOT NULL DEFAULT '2020-01-01 10:00:00' COMMENT 'It shall be possible that the different times are not on the same date; on the UI, do not show the date by default',
  `datetimeCall` datetime NOT NULL DEFAULT '2020-01-01 10:00:00' COMMENT 'It shall be possible that the different times are not on the same date; on the UI, do not show the date by default',
  `datetimeStart` datetime NOT NULL DEFAULT '2020-01-01 10:00:00' COMMENT 'It shall be possible that the different times are not on the same date; on the UI, do not show the date by default',
  `status` tinyint(3) unsigned NOT NULL DEFAULT 10 COMMENT 'Startliste/Appell gemacht/Serien eingeteilt/Resultate erfasst/...',
  `conf` text NOT NULL DEFAULT '' COMMENT '(replacement for extra tables for each discipline)\nThe configuration for the discipline: timing-stuff, number of attempts in tech, do final in tech, # finalists, turnOrder, jumpoff techHhigh), heightIncreases, ...',
  `name` varchar(50) DEFAULT '',
  PRIMARY KEY (`xContest`),
  KEY `fk_contests_baseDisciplines1_idx` (`xBaseDiscipline`),
  CONSTRAINT `fk_contests_baseDisciplines1` FOREIGN KEY (`xBaseDiscipline`) REFERENCES `basedisciplines` (`xBaseDiscipline`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb3 COMMENT='NOTE: It should be tried to have all competition specific configuration in the configuration string. ';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contests`
--

LOCK TABLES `contests` WRITE;
/*!40000 ALTER TABLE `contests` DISABLE KEYS */;
INSERT INTO `contests` VALUES (1,0,'2020-01-01 10:00:00','2020-01-01 10:00:00','2020-01-01 10:00:00',10,'',''),(2,0,'2020-01-01 10:00:00','2020-01-01 10:00:00','2020-01-01 10:00:00',10,'',''),(3,0,'2020-01-01 10:00:00','2020-01-01 10:00:00','2020-01-01 10:00:00',95,'{\"heightIncreases\":[{\"heightIncreaseStartheight\":200,\"heightIncrease\":25},{\"heightIncreaseStartheight\":250,\"heightIncrease\":20}],\"jumpoff\":false}',''),(4,0,'2020-01-01 10:00:00','2020-01-01 10:00:00','2020-01-01 10:00:00',10,'',''),(5,0,'2020-01-01 10:00:00','2020-01-01 10:00:00','2020-01-01 10:00:00',10,'','');
/*!40000 ALTER TABLE `contests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contests_tech`
--

DROP TABLE IF EXISTS `contests_tech`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contests_tech` (
  `xContest` int(10) unsigned NOT NULL,
  `attempts` tinyint(3) unsigned NOT NULL DEFAULT 1 COMMENT 'how many attempts per athlete (',
  `final` bit(1) NOT NULL DEFAULT b'0' COMMENT 'could also be done by setting attmeptsBeforeFinal=0',
  `finalists` tinyint(4) NOT NULL DEFAULT 0,
  `attempsBeforeFinal` tinyint(4) NOT NULL DEFAULT 0,
  `turnOrder` bit(1) NOT NULL DEFAULT b'0',
  `bestResOnly` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`xContest`),
  CONSTRAINT `fk_contest_tech_contest1` FOREIGN KEY (`xContest`) REFERENCES `contests` (`xContest`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='stores the settings for technical rounds (number of attempts, perform a final)\nactually this could all be stored also as a simple configuration string';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contests_tech`
--

LOCK TABLES `contests_tech` WRITE;
/*!40000 ALTER TABLE `contests_tech` DISABLE KEYS */;
/*!40000 ALTER TABLE `contests_tech` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contests_track`
--

DROP TABLE IF EXISTS `contests_track`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contests_track` (
  `xContest` int(10) unsigned NOT NULL,
  `statusTimekeeper` tinyint(3) unsigned NOT NULL DEFAULT 0 COMMENT 'what is that for? store whether the data has already been writen (then it maybe should be changed to series, given the chronometry can import single series and not only groups of series)?',
  `trackQnty` tinyint(3) unsigned NOT NULL DEFAULT 6 COMMENT 'maybe deleted and replace with the setting that is made via the site',
  PRIMARY KEY (`xContest`),
  CONSTRAINT `fk_contest_track_contest1` FOREIGN KEY (`xContest`) REFERENCES `contests` (`xContest`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='probably this is not necessary: trackQnty is given in the site-table, and the statusTimekeeper might be obsolete, when assuming that it must be uptodate always\n\nno qualification stuff here anymore because:\n- would not be logical whether the configuration counts from the last round to this or to the next\n- one round of a contest would not  have a configuration --> space unsed without need\n- would not allow for different qualification strategies, that e.g. also migh be applied to tech disciplines';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contests_track`
--

LOCK TABLES `contests_track` WRITE;
/*!40000 ALTER TABLE `contests_track` DISABLE KEYS */;
/*!40000 ALTER TABLE `contests_track` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `conversionparams`
--

DROP TABLE IF EXISTS `conversionparams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `conversionparams` (
  `xConversion` int(10) unsigned NOT NULL,
  `xDiscipline` int(10) unsigned NOT NULL,
  `params` varchar(100) NOT NULL DEFAULT '',
  PRIMARY KEY (`xConversion`,`xDiscipline`),
  KEY `fk_conversionParams_conversion_idx` (`xConversion`),
  KEY `fk_conversionParams_disciplineType_idx` (`xDiscipline`),
  CONSTRAINT `fk_conversionParams_conversion` FOREIGN KEY (`xConversion`) REFERENCES `conversions` (`xConversion`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_conversionParams_disciplineType` FOREIGN KEY (`xDiscipline`) REFERENCES `disciplines` (`xDiscipline`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='stores the paramteters for each conversion type for each discipline\n--> for ''each'' discipline?  not necessary all.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conversionparams`
--

LOCK TABLES `conversionparams` WRITE;
/*!40000 ALTER TABLE `conversionparams` DISABLE KEYS */;
/*!40000 ALTER TABLE `conversionparams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `conversions`
--

DROP TABLE IF EXISTS `conversions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `conversions` (
  `xConversion` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL COMMENT 'possible problem: translation; as long as this is simply a general name like ''IAAF'' or ''swiss-athletics'', it is no problem',
  `type` tinyint(3) unsigned NOT NULL DEFAULT 0 COMMENT 'defines the internal routine that should be called',
  PRIMARY KEY (`xConversion`),
  UNIQUE KEY `name_UNIQUE` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='stores the different conversion types --> ''+-unchangable table'', so probably better not in databse, but ''conf-coded'' somewhere';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conversions`
--

LOCK TABLES `conversions` WRITE;
/*!40000 ALTER TABLE `conversions` DISABLE KEYS */;
/*!40000 ALTER TABLE `conversions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `countries`
--

DROP TABLE IF EXISTS `countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `countries` (
  `xCountry` char(3) NOT NULL,
  `countryName` varchar(100) NOT NULL DEFAULT '',
  `countrySortvalue` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`xCountry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='the countries are now included in the region table; this table is not used anymore.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `countries`
--

LOCK TABLES `countries` WRITE;
/*!40000 ALTER TABLE `countries` DISABLE KEYS */;
/*!40000 ALTER TABLE `countries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `disciplines`
--

DROP TABLE IF EXISTS `disciplines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `disciplines` (
  `xDiscipline` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `xBaseDiscipline` int(10) unsigned NOT NULL COMMENT 'Use the same number for disciplines which shall be joinable.',
  `sortorder` int(10) unsigned NOT NULL DEFAULT 1 COMMENT 'Sortierwert?',
  `indoor` bit(1) NOT NULL DEFAULT b'0',
  `active` bit(1) NOT NULL DEFAULT b'1',
  `configuration` text NOT NULL DEFAULT '' COMMENT 'This should contain e.g. a JSON string with discipline specific settings, e.g. distance, wind, whatever, which is then interpreted by the type of the discipline. ',
  PRIMARY KEY (`xDiscipline`,`xBaseDiscipline`),
  KEY `Anzeige` (`sortorder`),
  KEY `baseDiscipline` (`xBaseDiscipline`),
  CONSTRAINT `fk_disciplines_baseDisciplines1` FOREIGN KEY (`xBaseDiscipline`) REFERENCES `basedisciplines` (`xBaseDiscipline`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=208 DEFAULT CHARSET=utf8mb3 COMMENT='wind, distance etc are specified in configuration';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `disciplines`
--

LOCK TABLES `disciplines` WRITE;
/*!40000 ALTER TABLE `disciplines` DISABLE KEYS */;
INSERT INTO `disciplines` VALUES (206,1,1,'\0','','{\"heightMax\":650}'),(207,2,2,'\0','','{\"heightMax\":260}');
/*!40000 ALTER TABLE `disciplines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `disciplinesonsite`
--

DROP TABLE IF EXISTS `disciplinesonsite`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `disciplinesonsite` (
  `xSite` int(10) unsigned NOT NULL,
  `xBaseDiscipline` int(10) unsigned NOT NULL,
  PRIMARY KEY (`xBaseDiscipline`,`xSite`),
  KEY `fk_disciplines_on_site_sites1_idx` (`xSite`),
  CONSTRAINT `fk_disciplines_on_site_sites1` FOREIGN KEY (`xSite`) REFERENCES `sites` (`xSite`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='The alternative to this table would be to define several site types (e.g. track: straight only or full track, with/out wind, max-length; tech: hammer/discus combined or only one of them? Longjump/Triplejump or only one of them?). However, this is not flexible enough when the database should also be able to handle any kind of special, yet unknown disciplines. Therefore, we use this more generalized approach. ';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `disciplinesonsite`
--

LOCK TABLES `disciplinesonsite` WRITE;
/*!40000 ALTER TABLE `disciplinesonsite` DISABLE KEYS */;
/*!40000 ALTER TABLE `disciplinesonsite` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `eventgroups`
--

DROP TABLE IF EXISTS `eventgroups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `eventgroups` (
  `xEventGroup` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `xDiscipline` int(10) unsigned NOT NULL,
  `name` varchar(50) NOT NULL DEFAULT '',
  `combined` bit(1) NOT NULL DEFAULT b'0' COMMENT 'this means it is a combined event (heptathlon, ...) --> prevents having multiple rounds as there every discipline has only one round',
  PRIMARY KEY (`xEventGroup`),
  KEY `fk_contest_disciplineType1_idx` (`xDiscipline`),
  CONSTRAINT `fk_contest_disciplineType1` FOREIGN KEY (`xDiscipline`) REFERENCES `disciplines` (`xDiscipline`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3 COMMENT='entually add here some configuration stuff for groups that might be useful when group-memberships should be transferred: e.g. shall all rounds share the same groups, i.e. the person is always in group 2\nmaybe a part of this info must also be stored in rounds!';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `eventgroups`
--

LOCK TABLES `eventgroups` WRITE;
/*!40000 ALTER TABLE `eventgroups` DISABLE KEYS */;
INSERT INTO `eventgroups` VALUES (1,206,'Stab 2.00','\0'),(2,207,'Hoch2','\0'),(3,206,'Stab 4.20','\0'),(4,207,'test hoch','');
/*!40000 ALTER TABLE `eventgroups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `events` (
  `xEvent` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `xDiscipline` int(10) unsigned NOT NULL,
  `xCategory` int(10) unsigned NOT NULL COMMENT 'I think it is ok like this; but eventually we want to have the possibility for multiple categories per event for some reason. Then an additional table with the categories per ventu would be needed. ',
  `xEventGroup` int(10) unsigned DEFAULT NULL,
  `entryFee` float unsigned NOT NULL DEFAULT 0,
  `bailFee` float unsigned NOT NULL DEFAULT 0,
  `onlineId` varchar(36) DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `info` varchar(50) DEFAULT NULL,
  `nationalBody` char(3) DEFAULT NULL,
  PRIMARY KEY (`xEvent`),
  KEY `fk_discipline_disciplineType1_idx` (`xDiscipline`),
  KEY `fk_discipline_category1_idx` (`xCategory`),
  KEY `fk_events_eventGroup1_idx` (`xEventGroup`),
  CONSTRAINT `fk_discipline_category1` FOREIGN KEY (`xCategory`) REFERENCES `categories` (`xCategory`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_discipline_disciplineType1` FOREIGN KEY (`xDiscipline`) REFERENCES `disciplines` (`xDiscipline`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_events_eventGroup1` FOREIGN KEY (`xEventGroup`) REFERENCES `eventgroups` (`xEventGroup`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb3 COMMENT='the events (=single disciplines), an athlete / relay can have an inscription (table start) to\n\nnot implemented compared to wettkampf, but seems ok like this:\ntyp (formerly used to distinguish combined), Punktetabelle, Punkteformel, Windmessung, Zeitmessung, ZeitmessungAuto, Mehrkampfcode, Mehrkampfende, Mehrkampfreihenfolge, xKategorie_SVM, TypAenderung (seems was unused)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `events`
--

LOCK TABLES `events` WRITE;
/*!40000 ALTER TABLE `events` DISABLE KEYS */;
INSERT INTO `events` VALUES (1,206,1,1,0,0,'0','2021-01-01 05:23:00','200',NULL),(4,207,4,2,15,0,'0',NULL,'',NULL),(5,206,7,1,3,0,'0','2021-01-01 09:10:00','200',NULL),(6,206,2,NULL,0,0,'0','2021-01-01 09:00:00','',NULL),(7,206,1,3,0,0,'0','2021-01-01 12:00:00','420',NULL);
/*!40000 ALTER TABLE `events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `groups`
--

DROP TABLE IF EXISTS `groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `groups` (
  `xRound` int(10) unsigned NOT NULL,
  `number` smallint(5) unsigned NOT NULL DEFAULT 1,
  `xContest` int(10) unsigned DEFAULT NULL COMMENT 'eventually allow null here',
  `name` varchar(45) NOT NULL DEFAULT '' COMMENT 'shall be implemented in the future: each group can have a name, and not only a number.',
  PRIMARY KEY (`xRound`,`number`),
  UNIQUE KEY `uq_xRound_number` (`xRound`,`number`),
  KEY `fk_rounds_has_contest_rounds1_idx` (`xRound`),
  KEY `fk_groups_contest1_idx` (`xContest`),
  CONSTRAINT `fk_groups_contest1` FOREIGN KEY (`xContest`) REFERENCES `contests` (`xContest`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_rounds_has_contest_rounds1` FOREIGN KEY (`xRound`) REFERENCES `rounds` (`xRound`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `groups`
--

LOCK TABLES `groups` WRITE;
/*!40000 ALTER TABLE `groups` DISABLE KEYS */;
INSERT INTO `groups` VALUES (277,1,3,'Gruppe 1'),(277,2,4,'Gruppe 2'),(278,1,2,'Gruppe 1'),(308,1,3,'Gruppe 1');
/*!40000 ALTER TABLE `groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `heightincreases`
--

DROP TABLE IF EXISTS `heightincreases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `heightincreases` (
  `xHeightIncrease` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `xContest` int(10) unsigned NOT NULL COMMENT 'to which series this incrementation belongs',
  `heightIncreaseStartheight` smallint(5) unsigned NOT NULL COMMENT 'starting at which height',
  `heightIncrease` smallint(5) unsigned NOT NULL DEFAULT 0 COMMENT 'increase steps from this height on',
  PRIMARY KEY (`xHeightIncrease`),
  KEY `fk_heightIncreases_rounds_high1_idx` (`xContest`),
  CONSTRAINT `fk_heightIncreases_rounds_high1` FOREIGN KEY (`xContest`) REFERENCES `contest_high` (`xContests`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `heightincreases`
--

LOCK TABLES `heightincreases` WRITE;
/*!40000 ALTER TABLE `heightincreases` DISABLE KEYS */;
/*!40000 ALTER TABLE `heightincreases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `heights`
--

DROP TABLE IF EXISTS `heights`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `heights` (
  `xHeight` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `xSeries` int(10) unsigned NOT NULL,
  `jumpoffOrder` smallint(5) unsigned NOT NULL DEFAULT 0 COMMENT 'defines the order if it is a jumpoff height. For all other heights, this property has to be 0. The height is then automatically given through the height, as it can only increase.',
  `height` smallint(5) unsigned NOT NULL,
  PRIMARY KEY (`xHeight`),
  KEY `fk_height_series1_idx` (`xSeries`),
  CONSTRAINT `fk_height_series1` FOREIGN KEY (`xSeries`) REFERENCES `series` (`xSeries`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `heights`
--

LOCK TABLES `heights` WRITE;
/*!40000 ALTER TABLE `heights` DISABLE KEYS */;
/*!40000 ALTER TABLE `heights` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inscriptions`
--

DROP TABLE IF EXISTS `inscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inscriptions` (
  `xInscription` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `xCategory` int(10) unsigned NOT NULL,
  `number` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'bib',
  PRIMARY KEY (`xInscription`),
  KEY `fk_inscription_category1_idx` (`xCategory`),
  CONSTRAINT `fk_inscription_category1` FOREIGN KEY (`xCategory`) REFERENCES `categories` (`xCategory`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=1111 DEFAULT CHARSET=utf8mb3 COMMENT='why do we need inscriptions: because we want that relays and regular athletes can be treated the same in the events! this is also the reason why athletes/relays are a "subtable" of inscritpion and not vice versa.\n\nev. delete xCategory\n\nmissing:\nErstserie, Bezahlt, Gruppe(!), BestleistungMK, Vereinsinfo, xTeam, BaseEffortMK, AnmeldeNr_ZLV (!), KidID, Angemeldet, VorjahrleistungMK';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inscriptions`
--

LOCK TABLES `inscriptions` WRITE;
/*!40000 ALTER TABLE `inscriptions` DISABLE KEYS */;
INSERT INTO `inscriptions` VALUES (4,8,1035),(100,7,26),(101,7,27),(102,1,28),(103,7,29),(104,1,30),(105,1,112),(106,7,31),(107,7,32),(108,7,33),(109,1,34),(110,1,35),(111,1,36),(112,1,37),(113,1,38),(114,7,39),(115,1,40),(116,7,41),(117,7,42),(118,7,43),(119,1,44),(120,1,45),(121,7,46),(122,1,47),(123,7,48),(124,1,49),(125,1,50),(126,7,51),(127,1,52),(128,1,53),(129,7,54),(130,7,55),(131,1,56),(132,1,57),(133,1,58),(134,1,59),(135,1,60),(136,1,61),(137,7,62),(138,7,63),(139,1,64),(140,1,65),(141,7,66),(142,7,67),(143,7,68),(144,1,69),(145,7,70),(146,7,71),(147,7,72),(148,7,73),(149,1,74),(150,7,75),(151,7,76),(152,1,77),(153,7,78),(154,7,79),(155,7,80),(156,7,81),(157,1,82),(158,7,83),(159,1,84),(160,1,85),(161,1,86),(162,7,87),(163,1,88),(164,1,89),(165,7,90),(166,1,91),(167,1,92),(168,1,93),(169,1,94),(170,7,95),(171,7,96),(172,1,97),(173,1,98),(174,7,99),(175,1,100),(176,1,101),(177,7,102),(178,7,103),(179,1,104),(180,7,105),(181,1,106),(182,7,107),(183,7,108),(184,7,109),(185,7,110),(186,1,111),(187,1,25),(188,7,113),(189,7,114),(190,7,115),(191,1,116),(192,1,117),(193,1,118),(194,1,119),(195,1,120),(196,7,121),(197,1,122),(198,7,123),(199,7,124),(200,1,125),(201,7,126),(202,1,127),(203,7,128),(204,7,129),(205,7,130),(206,7,131),(207,1,132),(208,7,133),(209,7,134),(210,7,135),(211,7,136),(212,7,137),(213,7,138),(214,1,139),(215,7,140),(216,7,141),(217,1,142),(218,1,143),(219,7,144),(220,1,145),(221,1,146),(222,1,147),(223,7,148),(224,7,149),(225,7,150),(226,7,151),(227,1,152),(228,7,153),(229,7,154),(230,7,155),(231,1,156),(232,7,157),(233,7,159),(234,1,158),(235,7,161),(236,1,160),(237,7,162),(238,1,163),(239,7,164),(240,7,165),(241,7,166),(242,1,167),(243,1,168),(244,7,169),(245,7,170),(246,1,171),(247,1,172),(248,7,173),(249,7,174),(250,1,175),(251,7,176),(252,1,177),(253,7,178),(254,7,179),(255,7,180),(256,7,181),(257,7,182),(258,7,183),(259,7,184),(260,1,185),(261,1,186),(262,7,187),(263,1,188),(264,1,189),(265,7,190),(266,1,191),(267,1,192),(268,1,193),(269,1,194),(270,7,195),(271,1,196),(272,7,197),(273,7,198),(274,7,199),(275,7,200),(276,7,201),(277,7,202),(278,7,203),(279,1,204),(280,1,205),(281,7,206),(282,7,207),(283,7,208),(284,7,209),(285,7,210),(286,1,211),(287,1,212),(288,1,213),(289,7,214),(290,1,215),(291,7,216),(292,7,217),(293,7,218),(294,7,220),(295,1,219),(296,7,221),(297,1,222),(298,7,223),(299,7,224),(300,7,225),(301,7,226),(302,7,227),(303,7,228),(304,7,229),(305,7,230),(306,7,231),(307,7,232),(308,1,233),(309,7,234),(310,7,235),(311,7,236),(312,7,237),(313,1,238),(314,1,239),(315,1,240),(316,7,241),(317,1,242),(318,7,243),(319,1,244),(320,7,245),(321,1,246),(322,1,247),(323,7,248),(324,7,249),(325,1,250),(326,7,251),(327,7,252),(328,7,253),(329,1,254),(330,7,255),(331,7,257),(332,7,258),(333,7,259),(334,7,260),(335,7,261),(336,1,256),(337,1,262),(338,7,263),(339,7,267),(340,7,264),(341,1,265),(342,7,266),(343,7,268),(344,7,269),(345,7,270),(346,7,271),(347,7,272),(348,7,273),(349,7,274),(350,7,277),(351,1,275),(352,1,276),(353,7,278),(354,7,279),(355,7,280),(356,7,281),(357,7,282),(358,1,283),(359,7,284),(360,1,285),(361,7,286),(362,7,287),(363,7,288),(364,1,289),(365,7,290),(366,7,291),(367,7,292),(368,1,293),(369,1,294),(370,7,295),(371,7,296),(372,1,297),(373,7,298),(374,7,299),(375,7,300),(376,7,301),(377,1,302),(378,1,303),(379,7,304),(380,1,305),(381,1,306),(382,7,307),(383,7,308),(384,1,309),(385,1,310),(386,7,311),(387,1,312),(388,7,313),(389,7,314),(390,7,315),(391,1,316),(392,1,317),(393,7,318),(394,7,319),(395,7,320),(396,7,321),(397,1,322),(398,1,323),(399,1,324),(400,7,325),(401,7,326),(402,1,327),(403,7,328),(404,1,329),(405,7,330),(406,7,331),(407,1,332),(408,1,333),(409,1,334),(410,1,335),(411,7,336),(412,7,337),(413,1,338),(414,7,339),(415,1,340),(416,7,341),(417,1,342),(418,1,343),(419,7,344),(420,7,345),(421,7,346),(422,1,347),(423,1,348),(424,1,349),(425,1,350),(426,1,351),(427,1,352),(428,7,353),(429,1,354),(430,7,355),(431,7,356),(432,1,357),(433,7,358),(434,7,359),(435,1,360),(436,7,361),(437,1,362),(438,7,363),(439,7,364),(440,7,365),(441,1,366),(442,7,367),(443,1,368),(444,7,369),(445,1,370),(446,1,371),(447,7,372),(448,1,373),(449,7,374),(450,7,375),(451,1,376),(452,7,377),(453,7,378),(454,7,379),(455,1,380),(456,7,381),(457,7,382),(458,1,383),(459,7,384),(460,1,385),(461,7,386),(462,1,387),(463,7,388),(464,7,389),(465,7,390),(466,7,391),(467,7,392),(468,7,393),(469,1,394),(470,1,395),(471,7,396),(472,7,397),(473,1,398),(474,1,399),(475,7,400),(476,1,401),(477,1,402),(478,7,403),(479,7,404),(480,7,405),(481,7,406),(482,1,407),(483,7,408),(484,1,409),(485,1,410),(486,7,411),(487,7,412),(488,7,413),(489,7,414),(490,7,415),(491,1,416),(492,1,417),(493,1,418),(494,1,419),(495,1,420),(496,1,421),(497,7,422),(498,1,423),(499,7,424),(500,7,425),(501,7,426),(502,7,427),(503,7,428),(504,1,429),(505,1,430),(506,7,431),(507,7,432),(508,7,433),(509,7,434),(510,7,435),(511,1,436),(512,7,437),(513,1,438),(514,7,439),(515,7,440),(516,7,441),(517,7,442),(518,7,443),(519,1,444),(520,7,445),(521,1,446),(522,1,447),(523,7,448),(524,7,449),(525,7,450),(526,1,451),(527,7,452),(528,7,453),(529,1,454),(530,7,455),(531,7,456),(532,1,457),(533,1,458),(534,7,459),(535,1,460),(536,1,461),(537,1,462),(538,1,463),(539,7,464),(540,1,465),(541,1,466),(542,1,467),(543,7,468),(544,1,469),(545,7,470),(546,1,471),(547,1,472),(548,7,473),(549,7,474),(550,7,475),(551,7,476),(552,7,477),(553,1,478),(554,7,479),(555,7,480),(556,7,481),(557,1,482),(558,1,483),(559,1,484),(560,7,485),(561,7,486),(562,1,487),(563,7,488),(564,1,489),(565,7,490),(566,1,491),(567,7,492),(568,1,493),(569,7,494),(570,7,495),(571,7,496),(572,1,497),(573,1,498),(574,7,499),(575,7,500),(576,7,501),(577,1,502),(578,1,503),(579,7,504),(580,7,505),(581,1,508),(582,1,509),(583,1,510),(584,1,511),(585,7,512),(586,7,513),(587,1,548),(588,1,514),(589,1,515),(590,1,516),(591,1,517),(592,1,518),(593,7,519),(594,7,520),(595,1,521),(596,1,522),(597,7,523),(598,7,524),(599,7,525),(600,1,526),(601,7,527),(602,1,528),(603,1,529),(604,7,530),(605,1,531),(606,7,532),(607,1,533),(608,7,534),(609,7,535),(610,1,536),(611,7,537),(612,7,538),(613,1,539),(614,7,540),(615,7,541),(616,1,542),(617,7,543),(618,1,544),(619,1,545),(620,1,546),(621,1,547),(622,7,549),(623,1,550),(624,7,551),(625,1,552),(626,7,553),(627,1,554),(628,1,555),(629,1,556),(630,7,557),(631,1,558),(632,1,559),(633,7,560),(634,7,561),(635,7,562),(636,7,563),(637,7,564),(638,7,565),(639,7,566),(640,1,567),(641,7,568),(642,1,569),(643,1,570),(644,1,571),(645,7,572),(646,7,574),(647,1,575),(648,7,573),(649,1,576),(650,1,577),(651,1,578),(652,1,579),(653,1,580),(654,7,581),(655,7,582),(656,7,583),(657,7,584),(658,1,585),(659,7,586),(660,1,587),(661,1,588),(662,7,589),(663,7,590),(664,1,591),(665,1,592),(666,1,506),(667,1,593),(668,1,594),(669,7,595),(670,1,596),(671,1,597),(672,7,598),(673,1,599),(674,1,600),(675,7,601),(676,1,602),(677,7,603),(678,7,604),(679,7,605),(680,1,606),(681,1,607),(682,7,608),(683,1,609),(684,7,610),(685,1,611),(686,1,612),(687,7,613),(688,7,614),(689,1,615),(690,7,616),(691,7,617),(692,7,618),(693,7,619),(694,1,620),(695,1,621),(696,7,622),(697,7,623),(698,7,624),(699,1,625),(700,1,626),(701,1,627),(702,1,628),(703,7,629),(704,1,630),(705,7,631),(706,1,632),(707,1,633),(708,7,634),(709,1,635),(710,7,636),(711,1,637),(712,7,638),(713,7,639),(714,1,640),(715,7,641),(716,7,642),(717,7,643),(718,7,644),(719,1,645),(720,7,646),(721,1,647),(722,7,648),(723,7,649),(724,7,650),(725,1,651),(726,1,652),(727,7,653),(728,7,654),(729,7,655),(730,1,656),(731,1,657),(732,7,507),(733,1,658),(734,1,659),(735,1,660),(736,1,661),(737,1,662),(738,7,663),(739,7,664),(740,7,665),(741,7,666),(742,1,667),(743,1,668),(744,7,669),(745,1,670),(746,1,671),(747,1,672),(748,7,673),(749,1,674),(750,7,675),(751,7,676),(752,7,677),(753,7,678),(754,1,679),(755,1,680),(756,1,681),(757,7,682),(758,7,683),(759,7,684),(760,7,685),(761,1,686),(762,1,687),(763,7,688),(764,1,689),(765,1,690),(766,1,691),(767,7,692),(768,7,693),(769,7,694),(770,7,695),(771,7,696),(772,7,697),(773,1,698),(774,7,699),(775,1,700),(776,1,701),(777,1,702),(778,1,703),(779,1,704),(780,7,705),(781,7,706),(782,7,707),(783,1,708),(784,7,709),(785,7,710),(786,7,711),(787,7,712),(788,7,713),(789,7,714),(790,7,715),(791,7,716),(792,1,717),(793,7,718),(794,7,719),(795,1,720),(796,1,721),(797,1,722),(798,7,723),(799,1,724),(800,7,725),(801,1,726),(802,7,727),(803,1,728),(804,7,729),(805,7,730),(806,1,731),(807,1,732),(808,1,733),(809,7,734),(810,7,735),(811,7,736),(812,7,737),(813,7,738),(814,1,739),(815,1,740),(816,1,741),(817,7,742),(818,7,743),(819,1,744),(820,7,745),(821,7,746),(822,1,747),(823,7,748),(824,1,749),(825,7,750),(826,7,751),(827,1,752),(828,1,753),(829,1,754),(830,1,755),(831,7,756),(832,1,757),(833,1,758),(834,7,759),(835,1,760),(836,1,761),(837,7,762),(838,7,763),(839,1,764),(840,7,765),(841,7,766),(842,1,767),(843,7,768),(844,7,769),(845,1,770),(846,7,771),(847,7,772),(848,1,773),(849,7,774),(850,7,775),(851,7,917),(852,7,776),(853,7,777),(854,7,778),(855,7,779),(856,7,780),(857,7,781),(858,7,782),(859,1,783),(860,1,784),(861,7,785),(862,7,786),(863,1,787),(864,7,788),(865,1,789),(866,7,790),(867,1,791),(868,1,792),(869,1,793),(870,1,794),(871,1,795),(872,7,796),(873,1,797),(874,7,798),(875,1,799),(876,1,800),(877,1,801),(878,1,802),(879,1,803),(880,7,804),(881,1,805),(882,1,806),(883,7,807),(884,7,808),(885,1,809),(886,7,810),(887,1,811),(888,7,812),(889,7,813),(890,7,814),(891,7,815),(892,7,816),(893,7,817),(894,7,818),(895,7,819),(896,1,820),(897,7,821),(898,1,822),(899,7,823),(900,7,824),(901,1,825),(902,7,826),(903,1,827),(904,7,828),(905,7,829),(906,1,830),(907,7,831),(908,7,832),(909,1,833),(910,7,834),(911,7,835),(912,1,836),(913,7,837),(914,1,838),(915,1,839),(916,7,840),(917,7,841),(918,7,842),(919,7,843),(920,1,844),(921,7,845),(922,1,846),(923,7,847),(924,1,848),(925,7,849),(926,1,850),(927,7,851),(928,1,852),(929,1,853),(930,1,854),(931,7,855),(932,7,856),(933,1,857),(934,1,858),(935,7,859),(936,1,860),(937,7,861),(938,7,862),(939,1,863),(940,1,864),(941,7,865),(942,1,866),(943,7,867),(944,1,868),(945,7,869),(946,7,870),(947,1,871),(948,1,872),(949,1,873),(950,7,874),(951,7,875),(952,1,876),(953,1,877),(954,1,878),(955,7,879),(956,7,880),(957,7,881),(958,7,882),(959,1,883),(960,1,884),(961,7,885),(962,1,886),(963,1,887),(964,7,888),(965,7,889),(966,7,890),(967,7,891),(968,7,892),(969,7,893),(970,1,894),(971,7,895),(972,7,896),(973,1,897),(974,7,898),(975,7,899),(976,1,900),(977,1,901),(978,1,902),(979,7,903),(980,1,904),(981,7,905),(982,1,906),(983,7,907),(984,7,908),(985,1,909),(986,7,911),(987,1,910),(988,1,912),(989,1,913),(990,7,914),(991,7,915),(992,1,916),(993,7,923),(994,7,918),(995,1,919),(996,1,920),(997,7,921),(998,1,922),(999,1,1021),(1000,1,1022),(1001,1,1023),(1002,1,924),(1003,7,925),(1004,1,926),(1005,7,927),(1006,7,928),(1007,7,929),(1008,1,930),(1009,7,931),(1010,7,932),(1011,1,933),(1012,1,934),(1013,1,935),(1014,1,936),(1015,1,937),(1016,1,938),(1017,1,939),(1018,1,940),(1019,1,941),(1020,1,942),(1021,7,943),(1022,7,944),(1023,7,945),(1024,7,946),(1025,7,947),(1026,7,948),(1027,7,949),(1028,7,950),(1029,7,951),(1030,7,952),(1031,1,953),(1032,1,954),(1033,1,955),(1034,1,956),(1035,7,957),(1036,1,958),(1037,1,959),(1038,7,960),(1039,7,961),(1040,1,962),(1041,7,963),(1042,1,964),(1043,7,965),(1044,7,966),(1045,7,967),(1046,7,968),(1047,7,969),(1048,7,970),(1049,7,971),(1050,1,972),(1051,7,973),(1052,7,974),(1053,1,975),(1054,1,976),(1055,7,977),(1056,1,978),(1057,7,979),(1058,7,980),(1059,7,1016),(1060,1,981),(1061,7,982),(1062,7,983),(1063,7,1017),(1064,1,1018),(1065,7,1019),(1066,7,984),(1067,1,985),(1068,7,1020),(1069,7,986),(1070,7,987),(1071,7,988),(1072,7,989),(1073,1,990),(1074,1,991),(1075,7,992),(1076,7,993),(1077,7,994),(1078,7,995),(1079,7,996),(1080,7,997),(1081,1,998),(1082,7,999),(1083,7,1000),(1084,7,1001),(1085,7,1002),(1086,1,1003),(1087,1,1004),(1088,7,1005),(1089,7,1006),(1090,1,1007),(1091,1,1008),(1092,7,1009),(1093,1,1010),(1094,1,1011),(1095,7,1012),(1096,1,1013),(1097,1,1014),(1098,7,1015),(1099,1,1024),(1101,2,14),(1103,7,13),(1106,1,1046),(1107,8,1),(1108,1,0),(1109,7,0),(1110,1,0);
/*!40000 ALTER TABLE `inscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meetings`
--

DROP TABLE IF EXISTS `meetings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `meetings` (
  `xMeeting` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `meetingName` varchar(100) NOT NULL DEFAULT '',
  `location` varchar(100) NOT NULL DEFAULT '',
  `dateFrom` date NOT NULL,
  `dateTo` date NOT NULL,
  `meetingOnlineId` int(10) unsigned DEFAULT NULL,
  `isOnline` bit(1) NOT NULL DEFAULT b'0',
  `organizor` varchar(100) NOT NULL DEFAULT '',
  `entryFee` float NOT NULL DEFAULT 0,
  `entryFeeReduction` float NOT NULL DEFAULT 0,
  `bailFee` float NOT NULL DEFAULT 0,
  `meetingIsIndoor` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`xMeeting`),
  KEY `Name` (`meetingName`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb3 COMMENT='probably to be transferred to Mongo only.\n\nnot implemented:\nzeitmessung, password, AutoRangieren, statusChanged';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meetings`
--

LOCK TABLES `meetings` WRITE;
/*!40000 ALTER TABLE `meetings` DISABLE KEYS */;
/*!40000 ALTER TABLE `meetings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `modules`
--

DROP TABLE IF EXISTS `modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `modules` (
  `xModule` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `moduleName` varchar(100) NOT NULL,
  `moduleActivated` bit(1) NOT NULL DEFAULT b'1',
  `moduleType` smallint(6) NOT NULL,
  PRIMARY KEY (`xModule`),
  UNIQUE KEY `moduleName_UNIQUE` (`moduleName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `modules`
--

LOCK TABLES `modules` WRITE;
/*!40000 ALTER TABLE `modules` DISABLE KEYS */;
/*!40000 ALTER TABLE `modules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `regions`
--

DROP TABLE IF EXISTS `regions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `regions` (
  `xRegion` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `country` char(3) NOT NULL,
  `countryName` varchar(100) NOT NULL DEFAULT '',
  `countrySortvalue` int(11) NOT NULL DEFAULT 0,
  `regionName` varchar(100) NOT NULL DEFAULT '',
  `regionShortname` varchar(6) NOT NULL DEFAULT '',
  `regionSortvalue` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`xRegion`)
) ENGINE=InnoDB AUTO_INCREMENT=211 DEFAULT CHARSET=utf8mb3 COMMENT='country is also in regions. Have an entry with regionName etc ='''' for every country and where available also have additional entries where the regions are set.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `regions`
--

LOCK TABLES `regions` WRITE;
/*!40000 ALTER TABLE `regions` DISABLE KEYS */;
INSERT INTO `regions` VALUES (1,'SUI','Switzerland',1,'','',0),(2,'AFG','Afghanistan',2,'','',0),(3,'ALB','Albania',3,'','',0),(4,'ALG','Algeria',4,'','',0),(5,'ASA','American Samoa',5,'','',0),(6,'AND','Andorra',6,'','',0),(7,'ANG','Angola',7,'','',0),(8,'AIA','Anguilla',8,'','',0),(9,'ANT','Antigua & Barbuda',9,'','',0),(10,'ARG','Argentina',10,'','',0),(11,'ARM','Armenia',11,'','',0),(12,'ARU','Aruba',12,'','',0),(13,'AUS','Australia',13,'','',0),(14,'AUT','Austria',14,'','',0),(15,'AZE','Azerbaijan',15,'','',0),(16,'BAH','Bahamas',16,'','',0),(17,'BRN','Bahrain',17,'','',0),(18,'BAN','Bangladesh',18,'','',0),(19,'BAR','Barbados',19,'','',0),(20,'BLR','Belarus',20,'','',0),(21,'BEL','Belgium',21,'','',0),(22,'BIZ','Belize',22,'','',0),(23,'BEN','Benin',23,'','',0),(24,'BER','Bermuda',24,'','',0),(25,'BHU','Bhutan',25,'','',0),(26,'BOL','Bolivia',26,'','',0),(27,'BIH','Bosnia Herzegovina',27,'','',0),(28,'BOT','Botswana',28,'','',0),(29,'BRA','Brazil',29,'','',0),(30,'BRU','Brunei',30,'','',0),(31,'BUL','Bulgaria',31,'','',0),(32,'BRK','Burkina Faso',32,'','',0),(33,'BDI','Burundi',33,'','',0),(34,'CAM','Cambodia',34,'','',0),(35,'CMR','Cameroon',35,'','',0),(36,'CAN','Canada',36,'','',0),(37,'CPV','Cape Verde Islands',37,'','',0),(38,'CAY','Cayman Islands',38,'','',0),(39,'CAF','Central African Republic',39,'','',0),(40,'CHA','Chad',40,'','',0),(41,'CHI','Chile',41,'','',0),(42,'CHN','China',42,'','',0),(43,'COL','Colombia',43,'','',0),(44,'COM','Comoros',44,'','',0),(45,'CGO','Congo',45,'','',0),(46,'COD','Congo [Zaire]',46,'','',0),(47,'COK','Cook Islands',47,'','',0),(48,'CRC','Costa Rica',48,'','',0),(49,'CIV','Ivory Coast',49,'','',0),(50,'CRO','Croatia',50,'','',0),(51,'CUB','Cuba',51,'','',0),(52,'CYP','Cyprus',52,'','',0),(53,'CZE','Czech Republic',53,'','',0),(54,'DEN','Denmark',54,'','',0),(55,'DJI','Djibouti',55,'','',0),(56,'DMA','Dominica',56,'','',0),(57,'DOM','Dominican Republic',57,'','',0),(58,'TLS','East Timor',58,'','',0),(59,'ECU','Ecuador',59,'','',0),(60,'EGY','Egypt',60,'','',0),(61,'ESA','El Salvador',61,'','',0),(62,'GEQ','Equatorial Guinea',62,'','',0),(63,'ERI','Eritrea',63,'','',0),(64,'EST','Estonia',64,'','',0),(65,'ETH','Ethiopia',65,'','',0),(66,'FIJ','Fiji',66,'','',0),(67,'FIN','Finland',67,'','',0),(68,'FRA','France',68,'','',0),(69,'GAB','Gabon',69,'','',0),(70,'GAM','Gambia',70,'','',0),(71,'GEO','Georgia',71,'','',0),(72,'GER','Germany',72,'','',0),(73,'GHA','Ghana',73,'','',0),(74,'GIB','Gibraltar',74,'','',0),(75,'GBR','Great Britain & NI',75,'','',0),(76,'GRE','Greece',76,'','',0),(77,'GRN','Grenada',77,'','',0),(78,'GUM','Guam',78,'','',0),(79,'GUA','Guatemala',79,'','',0),(80,'GUI','Guinea',80,'','',0),(81,'GBS','Guinea-Bissau',81,'','',0),(82,'GUY','Guyana',82,'','',0),(83,'HAI','Haiti',83,'','',0),(84,'HON','Honduras',84,'','',0),(85,'HKG','Hong Kong',85,'','',0),(86,'HUN','Hungary',86,'','',0),(87,'ISL','Iceland',87,'','',0),(88,'IND','India',88,'','',0),(89,'INA','Indonesia',89,'','',0),(90,'IRI','Iran',90,'','',0),(91,'IRQ','Iraq',91,'','',0),(92,'IRL','Ireland',92,'','',0),(93,'ISR','Israel',93,'','',0),(94,'ITA','Italy',94,'','',0),(95,'JAM','Jamaica',95,'','',0),(96,'JPN','Japan',96,'','',0),(97,'JOR','Jordan',97,'','',0),(98,'KAZ','Kazakhstan',98,'','',0),(99,'KEN','Kenya',99,'','',0),(100,'KIR','Kiribati',100,'','',0),(101,'KOR','Korea',101,'','',0),(102,'KUW','Kuwait',102,'','',0),(103,'KGZ','Kirgizstan',103,'','',0),(104,'LAO','Laos',104,'','',0),(105,'LAT','Latvia',105,'','',0),(106,'LIB','Lebanon',106,'','',0),(107,'LES','Lesotho',107,'','',0),(108,'LBR','Liberia',108,'','',0),(109,'LIE','Liechtenstein',109,'','',0),(110,'LTU','Lithuania',110,'','',0),(111,'LUX','Luxembourg',111,'','',0),(112,'LBA','Libya',112,'','',0),(113,'MAC','Macao',113,'','',0),(114,'MKD','Macedonia',114,'','',0),(115,'MAD','Madagascar',115,'','',0),(116,'MAW','Malawi',116,'','',0),(117,'MAS','Malaysia',117,'','',0),(118,'MDV','Maldives',118,'','',0),(119,'MLI','Mali',119,'','',0),(120,'MLT','Malta',120,'','',0),(121,'MSH','Marshall Islands',121,'','',0),(122,'MTN','Mauritania',122,'','',0),(123,'MRI','Mauritius',123,'','',0),(124,'MEX','Mexico',124,'','',0),(125,'FSM','Micronesia',125,'','',0),(126,'MDA','Moldova',126,'','',0),(127,'MON','Monaco',127,'','',0),(128,'MGL','Mongolia',128,'','',0),(129,'MNE','Montenegro',129,'','',0),(130,'MNT','Montserrat',130,'','',0),(131,'MAR','Morocco',131,'','',0),(132,'MOZ','Mozambique',132,'','',0),(133,'MYA','Myanmar [Burma]',133,'','',0),(134,'NAM','Namibia',134,'','',0),(135,'NRU','Nauru',135,'','',0),(136,'NEP','Nepal',136,'','',0),(137,'NED','Netherlands',137,'','',0),(138,'AHO','Netherlands Antilles',138,'','',0),(139,'NZL','New Zealand',139,'','',0),(140,'NCA','Nicaragua',140,'','',0),(141,'NIG','Niger',141,'','',0),(142,'NGR','Nigeria',142,'','',0),(143,'NFI','Norfolk Islands',143,'','',0),(144,'PRK','North Korea',144,'','',0),(145,'NOR','Norway',145,'','',0),(146,'OMN','Oman',146,'','',0),(147,'PAK','Pakistan',147,'','',0),(148,'PLW','Palau',148,'','',0),(149,'PLE','Palestine',149,'','',0),(150,'PAN','Panama',150,'','',0),(151,'NGU','Papua New Guinea',151,'','',0),(152,'PAR','Paraguay',152,'','',0),(153,'PER','Peru',153,'','',0),(154,'PHI','Philippines',154,'','',0),(155,'POL','Poland',155,'','',0),(156,'POR','Portugal',156,'','',0),(157,'PUR','Puerto Rico',157,'','',0),(158,'QAT','Qatar',158,'','',0),(159,'ROM','Romania',159,'','',0),(160,'RUS','Russia',160,'','',0),(161,'RWA','Rwanda',161,'','',0),(162,'SMR','San Marino',162,'','',0),(163,'STP','São Tome & Principé',163,'','',0),(164,'KSA','Saudi Arabia',164,'','',0),(165,'SEN','Senegal',165,'','',0),(166,'SRB','Serbia',166,'','',0),(167,'SEY','Seychelles',167,'','',0),(168,'SLE','Sierra Leone',168,'','',0),(169,'SIN','Singapore',169,'','',0),(170,'SVK','Slovakia',170,'','',0),(171,'SLO','Slovenia',171,'','',0),(172,'SOL','Solomon Islands',172,'','',0),(173,'SOM','Somalia',173,'','',0),(174,'RSA','South Africa',174,'','',0),(175,'ESP','Spain',175,'','',0),(176,'SKN','St. Kitts & Nevis',176,'','',0),(177,'SRI','Sri Lanka',177,'','',0),(178,'LCA','St. Lucia',178,'','',0),(179,'VIN','St. Vincent & the Grenadines',179,'','',0),(180,'SUD','Sudan',180,'','',0),(181,'SUR','Surinam',181,'','',0),(182,'SWZ','Swaziland',182,'','',0),(183,'SWE','Sweden',183,'','',0),(184,'SYR','Syria',185,'','',0),(185,'TAH','Tahiti',186,'','',0),(186,'TPE','Taiwan',187,'','',0),(187,'TAD','Tadjikistan',188,'','',0),(188,'TAN','Tanzania',189,'','',0),(189,'THA','Thailand',190,'','',0),(190,'TOG','Togo',191,'','',0),(191,'TGA','Tonga',192,'','',0),(192,'TRI','Trinidad & Tobago',193,'','',0),(193,'TUN','Tunisia',194,'','',0),(194,'TUR','Turkey',195,'','',0),(195,'TKM','Turkmenistan',196,'','',0),(196,'TKS','Turks & Caicos Islands',197,'','',0),(197,'UGA','Uganda',198,'','',0),(198,'UKR','Ukraine',199,'','',0),(199,'UAE','United Arab Emirates',200,'','',0),(200,'USA','United States',201,'','',0),(201,'URU','Uruguay',202,'','',0),(202,'UZB','Uzbekistan',203,'','',0),(203,'VAN','Vanuatu',204,'','',0),(204,'VEN','Venezuela',205,'','',0),(205,'VIE','Vietnam',206,'','',0),(206,'ISV','Virgin Islands',207,'','',0),(207,'SAM','Western Samoa',208,'','',0),(208,'YEM','Yemen',209,'','',0),(209,'ZAM','Zambia',210,'','',0),(210,'ZIM','Zimbabwe',211,'','',0);
/*!40000 ALTER TABLE `regions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `relayathletepositions`
--

DROP TABLE IF EXISTS `relayathletepositions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `relayathletepositions` (
  `xRelayAthlete` int(10) unsigned NOT NULL,
  `xStartgroup` int(10) unsigned NOT NULL,
  `position` smallint(5) unsigned NOT NULL,
  PRIMARY KEY (`xRelayAthlete`,`xStartgroup`),
  KEY `fk_relayAthletePositions_relaysAthletes1_idx` (`xRelayAthlete`),
  KEY `fk_relayAthletePositions_startGroup1_idx` (`xStartgroup`),
  CONSTRAINT `fk_relayAthletePositions_relaysAthletes1` FOREIGN KEY (`xRelayAthlete`) REFERENCES `relayathletes` (`xRelayAthlete`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_relayAthletePositions_startGroup1` FOREIGN KEY (`xStartgroup`) REFERENCES `startsingroup` (`xStartgroup`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='the order of the atheltes in a relay; can be differnt in each round;\nTODO: it probably makes more sense not to Link to round, but instead store the integer value of the roundOrder; pro: athletes order can ba defined even before the relay has an entry in start and before the discipline has rounds and also a change in the link between the event and the contest would not result to problems; con: the order is just an integer --> the user can not easily see that it is related to quali/final/etc but must know this link by hard (except one programmatically tries to ad dthis information to the GUI)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `relayathletepositions`
--

LOCK TABLES `relayathletepositions` WRITE;
/*!40000 ALTER TABLE `relayathletepositions` DISABLE KEYS */;
/*!40000 ALTER TABLE `relayathletepositions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `relayathletes`
--

DROP TABLE IF EXISTS `relayathletes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `relayathletes` (
  `xRelayAthlete` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `xAthlete` int(10) unsigned NOT NULL,
  `xRelay` int(10) unsigned NOT NULL,
  PRIMARY KEY (`xRelayAthlete`),
  UNIQUE KEY `Secondary` (`xAthlete`,`xRelay`),
  KEY `fk_relaysAthletes_relays1_idx` (`xRelay`),
  CONSTRAINT `fk_relaysAthletes_athletes1` FOREIGN KEY (`xAthlete`) REFERENCES `athletes` (`xAthlete`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_relaysAthletes_relays1` FOREIGN KEY (`xRelay`) REFERENCES `relays` (`xRelay`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `relayathletes`
--

LOCK TABLES `relayathletes` WRITE;
/*!40000 ALTER TABLE `relayathletes` DISABLE KEYS */;
/*!40000 ALTER TABLE `relayathletes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `relays`
--

DROP TABLE IF EXISTS `relays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `relays` (
  `xRelay` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `xClub` int(10) unsigned NOT NULL,
  `xRegion` int(10) unsigned NOT NULL,
  `xCategory` int(10) unsigned NOT NULL COMMENT 'while an athlet has an birthdate, a relay simply has a category --> must be proven, that the athetes have the correct age at the date of the competition',
  `xBase` int(10) unsigned NOT NULL COMMENT 'the ID of the relay in the base data, analog to the license of an athlete',
  `xInscription` int(10) unsigned NOT NULL,
  PRIMARY KEY (`xRelay`,`xClub`,`xCategory`),
  KEY `fk_relay_club1_idx` (`xClub`),
  KEY `fk_relay_category1_idx` (`xCategory`),
  KEY `fk_relays_inscriptions1_idx` (`xInscription`),
  KEY `fk_relays_regions1_idx` (`xRegion`),
  CONSTRAINT `fk_relay_category1` FOREIGN KEY (`xCategory`) REFERENCES `categories` (`xCategory`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_relay_club1` FOREIGN KEY (`xClub`) REFERENCES `clubs` (`xClub`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_relays_inscriptions1` FOREIGN KEY (`xInscription`) REFERENCES `inscriptions` (`xInscription`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `fk_relays_regions1` FOREIGN KEY (`xRegion`) REFERENCES `regions` (`xRegion`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='if relay are always only created per meeting then it is not necessary to have this table. Instead, all this fileds can be implemented in inscription_relay';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `relays`
--

LOCK TABLES `relays` WRITE;
/*!40000 ALTER TABLE `relays` DISABLE KEYS */;
/*!40000 ALTER TABLE `relays` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resultshigh`
--

DROP TABLE IF EXISTS `resultshigh`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `resultshigh` (
  `xResult` int(10) unsigned NOT NULL,
  `xHeight` int(10) unsigned NOT NULL DEFAULT 0,
  `resultsHighFailedAttempts` tinyint(3) unsigned NOT NULL DEFAULT 0 COMMENT '- how many failed attempts on this height\n- this number also helps to count the total not passed attempts for the ordering',
  `resultsHighValid` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'passed this height already yes/no',
  `resultsHighPassed` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'verzichtet (-)',
  PRIMARY KEY (`xHeight`,`xResult`),
  KEY `fk_result_high_height1_idx` (`xHeight`),
  KEY `fk_resultsHigh_seriesStartsResults1_idx` (`xResult`),
  CONSTRAINT `fk_result_high_height1` FOREIGN KEY (`xHeight`) REFERENCES `heights` (`xHeight`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_resultsHigh_seriesStartsResults1` FOREIGN KEY (`xResult`) REFERENCES `seriesstartsresults` (`xSeriesStart`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='maybe make a separate column for passed (verzichtet) trial, as it is not directly related to the sortOrder (taking an athlet to the beginning/end of a trial), but as only one on or the other (sortOrder or passing) is possible at the same height, this still works';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resultshigh`
--

LOCK TABLES `resultshigh` WRITE;
/*!40000 ALTER TABLE `resultshigh` DISABLE KEYS */;
/*!40000 ALTER TABLE `resultshigh` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resultstech`
--

DROP TABLE IF EXISTS `resultstech`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `resultstech` (
  `xResultTech` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `xResult` int(10) unsigned NOT NULL,
  `result` smallint(6) NOT NULL DEFAULT 0 COMMENT 'in cm\n-1 for failed trial',
  `attempt` tinyint(3) unsigned NOT NULL COMMENT 'which attempt (start from 1)',
  PRIMARY KEY (`xResultTech`,`xResult`),
  KEY `fk_resultsTech_seriesStartsResults1_idx` (`xResult`),
  CONSTRAINT `fk_resultsTech_seriesStartsResults1` FOREIGN KEY (`xResult`) REFERENCES `seriesstartsresults` (`xSeriesStart`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='for horizontal jumps indoor and throwing';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resultstech`
--

LOCK TABLES `resultstech` WRITE;
/*!40000 ALTER TABLE `resultstech` DISABLE KEYS */;
/*!40000 ALTER TABLE `resultstech` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resultstechwind`
--

DROP TABLE IF EXISTS `resultstechwind`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `resultstechwind` (
  `xResultTechWind` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `xResult` int(10) unsigned NOT NULL,
  `result` smallint(6) NOT NULL DEFAULT 0 COMMENT 'in cm',
  `attempt` tinyint(3) unsigned NOT NULL COMMENT 'which attempt (start from 1)',
  `wind` smallint(6) NOT NULL DEFAULT 0 COMMENT 'unfortunately Wind must appear twice in the column-name\n\nmust be signed (+-)!\nin m/s\n',
  PRIMARY KEY (`xResultTechWind`,`xResult`),
  KEY `fk_resultsTechWind_seriesStartsResults1_idx` (`xResult`),
  CONSTRAINT `fk_resultsTechWind_seriesStartsResults1` FOREIGN KEY (`xResult`) REFERENCES `seriesstartsresults` (`xSeriesStart`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='compared to tech: has wind\nfor horizontal jumps outdoor';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resultstechwind`
--

LOCK TABLES `resultstechwind` WRITE;
/*!40000 ALTER TABLE `resultstechwind` DISABLE KEYS */;
/*!40000 ALTER TABLE `resultstechwind` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resultstrack`
--

DROP TABLE IF EXISTS `resultstrack`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `resultstrack` (
  `xResultTrack` int(10) unsigned NOT NULL,
  `time` int(10) unsigned NOT NULL COMMENT 'in 1/100''000s (hopefully futureproof)\nsufficient for all runs; takes up to 11.9h\n',
  `timeRounded` smallint(5) unsigned NOT NULL COMMENT 'rounded time, digits and rounding defined by the discipline',
  `rank` tinyint(3) unsigned NOT NULL COMMENT 'the ranking made by the finish-judge must be used and not the ranking given by the time!',
  PRIMARY KEY (`xResultTrack`),
  CONSTRAINT `fk_resultsTrack_seriesStartsResults1` FOREIGN KEY (`xResultTrack`) REFERENCES `seriesstartsresults` (`xSeriesStart`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resultstrack`
--

LOCK TABLES `resultstrack` WRITE;
/*!40000 ALTER TABLE `resultstrack` DISABLE KEYS */;
/*!40000 ALTER TABLE `resultstrack` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rounds`
--

DROP TABLE IF EXISTS `rounds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rounds` (
  `xRound` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `xEventGroup` int(10) unsigned NOT NULL,
  `name` varchar(50) NOT NULL DEFAULT '',
  `order` tinyint(3) unsigned NOT NULL,
  `numGroups` smallint(5) unsigned NOT NULL DEFAULT 1,
  `qualiModule` varchar(45) NOT NULL DEFAULT '' COMMENT 'the name of the qualiModule; must be unique among all modules (or only qualiModules) on the same server',
  `qualiConf` text DEFAULT NULL COMMENT 'could also be BLOB; allows 65536=2^16 bytes to be stored; attention: with charsets where one character can take more than one bytes,  numBytes < numChars!',
  PRIMARY KEY (`xRound`),
  UNIQUE KEY `uniqueRound` (`order`,`xEventGroup`),
  KEY `fk_round_contest1_idx` (`xEventGroup`),
  CONSTRAINT `fk_round_contest1` FOREIGN KEY (`xEventGroup`) REFERENCES `eventgroups` (`xEventGroup`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=309 DEFAULT CHARSET=utf8mb3 COMMENT='defines each round of a eventGroup\n\nqualification stuff is always related to "qualification from this round to the next round"\nqualif_type defines which class is used for the qualification stuff and interpretes the qualif_type-string, which shall contain the whole setup fir this qualification (number of seriesWinner, timeBest, ...), stored \nNOTE: in Athletica2 it was planned to have an extra table for the qualification linking both rounds; this however is unnecessary complicated and thus teh quali-configuration is now stored in the round qualified from.\nnot implemented:\nSpeakerstatus, StatusUpload, StatusUploadUKC';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rounds`
--

LOCK TABLES `rounds` WRITE;
/*!40000 ALTER TABLE `rounds` DISABLE KEYS */;
INSERT INTO `rounds` VALUES (277,1,'Vorrunde',1,2,'',''),(278,1,'Final',2,1,'',''),(308,3,'lll',1,1,'','');
/*!40000 ALTER TABLE `rounds` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `series`
--

DROP TABLE IF EXISTS `series`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `series` (
  `xSeries` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `xContest` int(10) unsigned NOT NULL,
  `xSite` int(10) unsigned DEFAULT NULL COMMENT 'philosophy question about the differentiation between series and groups: \n- if series should be a sequence on the same site, then the site should be defiend for the contest\n- if differen series should really have the chance to be on different sites, then keep it as it is\n\nimportant difference not to forget: groups can (not must) be defined before the role call, while series are defined after!\nadvantage when site is set for the contest and is a sequence on the same site: it is no problem to have a room for the contest, but at the same time it is then impossible to have two parallel series with a common final (as typical for long jump). However this is important, thus the site should be defined on series level. However, it is anyway just one room with multiple series and an advanced conflict management. ',
  `status` tinyint(3) unsigned NOT NULL DEFAULT 10,
  `number` smallint(5) unsigned NOT NULL COMMENT 'the number of the series; this was not implemented so far, the order of serie was given propably through xSeries; however, this is not very sexy.\nTODO: we could make xContest and number a unique constraint, but that would be difficult for series reordering',
  `name` varchar(50) NOT NULL DEFAULT '' COMMENT 'the name of the series: can be empty, but also e.g. "A" (for Final A; Final should be written in the round)',
  PRIMARY KEY (`xSeries`),
  KEY `fk_series_contest1_idx` (`xContest`),
  KEY `fk_series_sites1_idx` (`xSite`),
  CONSTRAINT `fk_series_contest1` FOREIGN KEY (`xContest`) REFERENCES `contests` (`xContest`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_series_sites1` FOREIGN KEY (`xSite`) REFERENCES `sites` (`xSite`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=102 DEFAULT CHARSET=utf8mb3 COMMENT='so far no seriesNumber column was available and the order of series probably relied on xSeries. This was not very sexy and is more clear now.\n\nnot implemented: \nTVname, MaxAthlet';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `series`
--

LOCK TABLES `series` WRITE;
/*!40000 ALTER TABLE `series` DISABLE KEYS */;
INSERT INTO `series` VALUES (99,3,NULL,0,3,''),(100,3,NULL,0,2,''),(101,3,NULL,0,1,'');
/*!40000 ALTER TABLE `series` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `series_track`
--

DROP TABLE IF EXISTS `series_track`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `series_track` (
  `xSeries` int(10) unsigned NOT NULL,
  `wind` smallint(6) NOT NULL DEFAULT 0 COMMENT 'this one must be signed!',
  `film` smallint(5) unsigned NOT NULL DEFAULT 0,
  `manual` bit(1) NOT NULL DEFAULT b'0' COMMENT 'manual timing?',
  PRIMARY KEY (`xSeries`),
  CONSTRAINT `fk_series_track_series1` FOREIGN KEY (`xSeries`) REFERENCES `series` (`xSeries`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `series_track`
--

LOCK TABLES `series_track` WRITE;
/*!40000 ALTER TABLE `series_track` DISABLE KEYS */;
/*!40000 ALTER TABLE `series_track` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `seriesstarts_high`
--

DROP TABLE IF EXISTS `seriesstarts_high`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `seriesstarts_high` (
  `xSeriesStart_high` int(10) unsigned NOT NULL,
  `startHeight` smallint(5) unsigned NOT NULL DEFAULT 0 COMMENT 'hier bewusst keine Referenz auf height, da dort der Eintrag erst später erstellt werden können soll, wenn die Höhe dran kommt (oder wenn jemand darauf verzeichtet)\n--> so programmieren, dass eine ungültige Starthöhe egal ist und dass programmseitig geprüft wird dass dies nicht passiert',
  PRIMARY KEY (`xSeriesStart_high`),
  CONSTRAINT `fk_seriesStart_high_seriesStart1` FOREIGN KEY (`xSeriesStart_high`) REFERENCES `seriesstartsresults` (`xSeriesStart`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `seriesstarts_high`
--

LOCK TABLES `seriesstarts_high` WRITE;
/*!40000 ALTER TABLE `seriesstarts_high` DISABLE KEYS */;
/*!40000 ALTER TABLE `seriesstarts_high` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `seriesstarts_track`
--

DROP TABLE IF EXISTS `seriesstarts_track`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `seriesstarts_track` (
  `xSeriesStart_track` int(10) unsigned NOT NULL,
  `lane` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`xSeriesStart_track`),
  CONSTRAINT `fk_seriesStart_track_seriesStart1` FOREIGN KEY (`xSeriesStart_track`) REFERENCES `seriesstartsresults` (`xSeriesStart`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='position (in seriesStartResult) is not necessary the same as lane (e.g. in every run >= 800m';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `seriesstarts_track`
--

LOCK TABLES `seriesstarts_track` WRITE;
/*!40000 ALTER TABLE `seriesstarts_track` DISABLE KEYS */;
/*!40000 ALTER TABLE `seriesstarts_track` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `seriesstartsresults`
--

DROP TABLE IF EXISTS `seriesstartsresults`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `seriesstartsresults` (
  `xSeriesStart` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `xStartgroup` int(10) unsigned NOT NULL,
  `xSeries` int(10) unsigned NOT NULL,
  `position` smallint(5) unsigned NOT NULL DEFAULT 0 COMMENT 'position:\nfor tech: the order of athletes\nfor track: side number; IMORTANT: for sprint this is the same as the lane defined in seriesStarts_track, but for middle/long distance it is not!',
  `resultOverrule` tinyint(3) unsigned NOT NULL DEFAULT 0 COMMENT 'DNS, DQ, DNF, NM, r (retired), withdrawal (combined only)\n(--> maybe NM and DNF not here)\n\n0=normal\n1=r (retired)=hört mitten im Wettkampf auf\n2=NM=o.g.V. (needed?)\n3=DNF=aufg.\n4=withdrawal=abgemeldet \n5=DNS=n.a.\n6=DQ=disq. --> nur diziplinarisch (kein Fehlstart --> ist im Resultat drin), damit man hiermit bestimmen kann, ob jemamnd nicht mehr starten darf',
  `resultRemark` varchar(100) NOT NULL DEFAULT '',
  `qualification` tinyint(4) NOT NULL DEFAULT 0 COMMENT 'stores how somebody was qualified AND also if somebody retired from the competition; the qualification-module must define whcih number belongs to what and must also provide what is needed for translation of that status into different languages!\nall modules MUST use 0 as default= not qualified for next round!',
  `startConf` text NOT NULL DEFAULT '' COMMENT 'the lane in track races and the startHeight for techHigh; replaces the separate tables',
  PRIMARY KEY (`xSeriesStart`),
  UNIQUE KEY `fk_seriesStarts_startGroup1_idx` (`xStartgroup`),
  KEY `fk_seriesStart_series1_idx` (`xSeries`),
  CONSTRAINT `fk_seriesStart_series1` FOREIGN KEY (`xSeries`) REFERENCES `series` (`xSeries`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_seriesStarts_startGroup1` FOREIGN KEY (`xStartgroup`) REFERENCES `startsingroup` (`xStartgroup`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=700 DEFAULT CHARSET=utf8mb3 COMMENT='\nnot implemented:\nRang, Qualifikation, RundeZusammen, Bemerkung, POsition2, Position3, AktivAthlet\n--> some of those were only needed to save the current athlete for the speakermonitor --> this should be possible differently!\n--> eventually include a second position column to store the current order for the use with Vor- und Endkampf in tech-disc; this is needed if we request that it is possible to get the the next athlete right out of the DB; however, we could also think of this ordering beeing done on the client, given the client can always get the rankinglist as it was after 3 attempts form the DB';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `seriesstartsresults`
--

LOCK TABLES `seriesstartsresults` WRITE;
/*!40000 ALTER TABLE `seriesstartsresults` DISABLE KEYS */;
INSERT INTO `seriesstartsresults` VALUES (680,414,99,7,0,'',0,''),(681,415,99,2,0,'',0,''),(682,421,99,4,0,'',0,''),(684,422,99,5,0,'',0,''),(685,420,99,3,0,'',0,''),(686,423,100,1,0,'',0,''),(687,424,99,6,0,'',0,''),(688,425,99,1,0,'',0,''),(689,426,100,2,0,'',0,''),(690,417,100,3,0,'',0,''),(691,433,100,5,0,'',0,''),(692,434,100,6,0,'',0,''),(694,19,101,1,0,'',0,''),(695,435,101,2,0,'',0,''),(697,431,101,3,0,'',0,''),(698,413,101,4,0,'',0,''),(699,419,100,4,0,'',0,'');
/*!40000 ALTER TABLE `seriesstartsresults` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sites`
--

DROP TABLE IF EXISTS `sites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sites` (
  `xSite` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL DEFAULT '',
  `homologated` bit(1) NOT NULL DEFAULT b'0',
  `isTrack` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`xSite`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='site_isTrack is used in order to know whether there is a configuration for it in the sites_chronometry table\nin the future, the site_isTrack could be replaced by a separate table, matching disciplines to a site --> would allow automatic allocation of sites to a contest, if it is unique';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sites`
--

LOCK TABLES `sites` WRITE;
/*!40000 ALTER TABLE `sites` DISABLE KEYS */;
/*!40000 ALTER TABLE `sites` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sites_track`
--

DROP TABLE IF EXISTS `sites_track`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sites_track` (
  `xSite` int(10) unsigned NOT NULL,
  `lanesStraight` tinyint(4) NOT NULL DEFAULT 6,
  `lanesTurn` tinyint(4) NOT NULL DEFAULT 6,
  `chronometryType` tinyint(4) NOT NULL DEFAULT 0,
  `chronometryConf` varchar(200) NOT NULL DEFAULT '',
  `chonometryName` varchar(50) NOT NULL DEFAULT '',
  PRIMARY KEY (`xSite`),
  CONSTRAINT `fk_sites_track_sites1` FOREIGN KEY (`xSite`) REFERENCES `sites` (`xSite`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sites_track`
--

LOCK TABLES `sites_track` WRITE;
/*!40000 ALTER TABLE `sites_track` DISABLE KEYS */;
/*!40000 ALTER TABLE `sites_track` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `starts`
--

DROP TABLE IF EXISTS `starts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `starts` (
  `xStart` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `xInscription` int(10) unsigned NOT NULL,
  `xEvent` int(10) unsigned NOT NULL,
  `paid` bit(1) NOT NULL DEFAULT b'0',
  `bestPerf` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'best perfoamnce in life',
  `bestPerfLast` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'best performance in the range of interest',
  `inBase` varchar(25) DEFAULT NULL,
  `competitive` bit(1) NOT NULL DEFAULT b'1' COMMENT 'competitive or non-competitive:\nif non-competitive, an athlete will not automatically be qualified for the next round and will not get a rank in the rankinglist.',
  PRIMARY KEY (`xStart`),
  UNIQUE KEY `noDoubleStarts` (`xEvent`,`xInscription`),
  KEY `fk_start_inscription1_idx` (`xInscription`),
  KEY `fk_starts_events1_idx` (`xEvent`),
  CONSTRAINT `fk_start_inscription1` FOREIGN KEY (`xInscription`) REFERENCES `inscriptions` (`xInscription`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_starts_events1` FOREIGN KEY (`xEvent`) REFERENCES `events` (`xEvent`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb3 COMMENT='do we really need the Performances here or do we want to store them differently (own table, together with base data, ...)?\n\nwhere to store the "present" field: if it is in "starts", it can only be used in the first round; additionally, since the list where the presence is noted is typically based on the contest and its appealTime, it makes sense to implement the present status in the "startInGroup" table. However, this also means that we must make sure that there is never an athlete without assignment to a group. \n\nnot implemented:\nErstserie, xStaffel';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `starts`
--

LOCK TABLES `starts` WRITE;
/*!40000 ALTER TABLE `starts` DISABLE KEYS */;
INSERT INTO `starts` VALUES (23,1106,1,'\0',500,485,'0',''),(24,1103,5,'',230,220,'0',''),(25,1106,7,'\0',500,496,'0',''),(26,187,7,'\0',0,0,'',''),(27,105,7,'\0',0,0,'',''),(28,113,1,'\0',330,325,'',''),(29,109,7,'\0',310,310,'',''),(30,124,7,'\0',185,185,'',''),(32,149,7,'\0',0,0,'',''),(33,193,7,'\0',0,0,'',''),(34,1099,7,'\0',0,0,'',''),(35,238,7,'\0',0,0,'',''),(36,192,7,'\0',0,0,'',''),(37,179,7,'\0',0,0,'',''),(38,186,7,'\0',0,0,'',''),(39,181,7,'\0',0,0,'',''),(40,139,7,'\0',0,0,'',''),(42,169,7,'\0',442,440,'',''),(43,163,7,'\0',565,555,'',''),(44,106,1,'\0',0,0,'',''),(47,1109,5,'',478,478,'',''),(50,1107,5,'\0',222,222,'',''),(51,102,1,'\0',275,250,'',''),(52,1108,1,'',440,420,'','');
/*!40000 ALTER TABLE `starts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `startsingroup`
--

DROP TABLE IF EXISTS `startsingroup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `startsingroup` (
  `xStartgroup` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `xRound` int(10) unsigned NOT NULL,
  `number` smallint(5) unsigned NOT NULL,
  `xStart` int(10) unsigned NOT NULL,
  `present` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`xStartgroup`),
  UNIQUE KEY `secondary` (`xRound`,`xStart`) COMMENT 'in one round, an athlete can only participate in one group',
  KEY `fk_xStart` (`xStart`),
  KEY `fk_startsInGroup_groups1_idx` (`xRound`,`number`),
  CONSTRAINT `fk_startGroup_starts1` FOREIGN KEY (`xStart`) REFERENCES `starts` (`xStart`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_startsInGroup_groups1` FOREIGN KEY (`xRound`, `number`) REFERENCES `groups` (`xRound`, `number`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=436 DEFAULT CHARSET=utf8mb3 COMMENT='there is one entry per round for every starting athlete, linking him/her to a group; \nwhere to store the "present" field: if it is in "starts", it can only be used in the first round; additionally, since the list where the presence is noted is typically based on the contest and its appealTime, it makes sense to implement the present status in the "startInGroup" table. However, this also means that we must make sure that there is never an athlete without assignment to a group. \n';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `startsingroup`
--

LOCK TABLES `startsingroup` WRITE;
/*!40000 ALTER TABLE `startsingroup` DISABLE KEYS */;
INSERT INTO `startsingroup` VALUES (19,277,1,28,''),(413,308,1,25,''),(414,308,1,26,''),(415,308,1,27,''),(416,308,1,29,''),(417,308,1,30,''),(418,308,1,32,''),(419,308,1,33,'\0'),(420,308,1,34,''),(421,308,1,35,''),(422,308,1,36,''),(423,308,1,37,''),(424,308,1,38,''),(425,308,1,39,''),(426,308,1,40,''),(427,308,1,42,''),(428,308,1,43,'\0'),(429,277,1,44,''),(431,277,1,47,''),(433,277,1,50,''),(434,277,1,51,''),(435,277,1,52,'');
/*!40000 ALTER TABLE `startsingroup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teaminscriptions`
--

DROP TABLE IF EXISTS `teaminscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `teaminscriptions` (
  `xInscription` int(10) unsigned NOT NULL,
  `xTeam` int(10) unsigned NOT NULL,
  PRIMARY KEY (`xInscription`,`xTeam`),
  KEY `fk_teamInscriptions_teams1_idx` (`xTeam`),
  CONSTRAINT `fk_teamInscriptions_inscriptions1` FOREIGN KEY (`xInscription`) REFERENCES `inscriptions` (`xInscription`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_teamInscriptions_teams1` FOREIGN KEY (`xTeam`) REFERENCES `teams` (`xTeam`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='an athlete/relay can theoretically ba in multiple teams; whether this is needed or not: I dont know. If yes, it might be necessary to link certains starts of that athlete/relay to one team or the other, which would have to be done with the table teamStarts';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teaminscriptions`
--

LOCK TABLES `teaminscriptions` WRITE;
/*!40000 ALTER TABLE `teaminscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `teaminscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teams`
--

DROP TABLE IF EXISTS `teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `teams` (
  `xTeam` int(10) unsigned zerofill NOT NULL,
  `xCompetition` int(10) unsigned NOT NULL COMMENT 'really necessary?',
  `name` varchar(100) NOT NULL DEFAULT '',
  `xClub` int(10) unsigned NOT NULL,
  `perf` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'e.g. last year performance; eventually needed for setting series',
  PRIMARY KEY (`xTeam`),
  KEY `fk_teams_clubs1_idx` (`xClub`),
  KEY `fk_teams_competitions1_idx` (`xCompetition`),
  CONSTRAINT `fk_teams_clubs1` FOREIGN KEY (`xClub`) REFERENCES `clubs` (`xClub`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_teams_competitions1` FOREIGN KEY (`xCompetition`) REFERENCES `competitions` (`xCompetition`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='in the original, also the category had a column --> is that necessary? IMO: same competition, same category (in team competitions)\none could think about separating the team from the competition, but as teams are always different at each competition/meeting/from year to year/..., it meight be reasonable to store it in one ';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teams`
--

LOCK TABLES `teams` WRITE;
/*!40000 ALTER TABLE `teams` DISABLE KEYS */;
/*!40000 ALTER TABLE `teams` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2022-07-12 21:06:53
