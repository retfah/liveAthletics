-- phpMyAdmin SQL Dump
-- version 3.2.2.1
-- http://www.phpmyadmin.net
--
-- Host: localhost:3306
-- Erstellungszeit: 02. Mai 2020 um 09:59
-- Server Version: 5.1.50
-- PHP-Version: 5.2.6

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Datenbank: `athletica`
--

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `kategoriemod`
--

CREATE TABLE IF NOT EXISTS `kategoriemod` (
  `xKategorie` int(11) NOT NULL AUTO_INCREMENT,
  `Kurzname` varchar(4) NOT NULL DEFAULT '',
  `Name` varchar(30) NOT NULL DEFAULT '',
  `Anzeige` int(11) NOT NULL DEFAULT '1',
  `Alterslimite` tinyint(4) NOT NULL DEFAULT '99',
  `Code` varchar(8) NOT NULL DEFAULT '',
  `Geschlecht` enum('m','w') NOT NULL DEFAULT 'm',
  `aktiv` enum('y','n') NOT NULL DEFAULT 'y',
  PRIMARY KEY (`xKategorie`),
  UNIQUE KEY `Kurzname` (`Kurzname`),
  KEY `Anzeige` (`Anzeige`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=42 ;

--
-- Daten für Tabelle `kategoriemod`
--

INSERT INTO `kategoriemod` (`xKategorie`, `Kurzname`, `Name`, `Anzeige`, `Alterslimite`, `Code`, `Geschlecht`, `aktiv`) VALUES
(1, 'MAN_', 'MAN', 1, 99, 'MAN_', 'm', 'y'),
(2, 'U20M', 'U20 M', 4, 19, 'U20M', 'm', 'y'),
(3, 'U18M', 'U18 M', 5, 17, 'U18M', 'm', 'y'),
(4, 'U16M', 'U16 M', 6, 15, 'U16M', 'm', 'y'),
(5, 'U14M', 'U14 M', 7, 13, 'U14M', 'm', 'y'),
(6, 'U12M', 'U12 M', 8, 11, 'U12M', 'm', 'y'),
(7, 'WOM_', 'WOM', 10, 99, 'WOM_', 'w', 'y'),
(8, 'U20W', 'U20 W', 13, 19, 'U20W', 'w', 'y'),
(9, 'U18W', 'U18 W', 14, 17, 'U18W', 'w', 'y'),
(10, 'U16W', 'U16 W', 15, 15, 'U16W', 'w', 'y'),
(11, 'U14W', 'U14 W', 16, 13, 'U14W', 'w', 'y'),
(12, 'U12W', 'U12 W', 17, 11, 'U12W', 'w', 'y'),
(13, 'U23M', 'U23 M', 3, 22, 'U23M', 'm', 'y'),
(14, 'U23W', 'U23 W', 12, 22, 'U23W', 'w', 'y'),
(16, 'U10M', 'U10 M', 9, 9, 'U10M', 'm', 'y'),
(17, 'U10W', 'U10 W', 18, 9, 'U10W', 'w', 'y'),
(18, 'MASM', 'MASTERS M', 2, 99, 'MASM', 'm', 'y'),
(19, 'MASW', 'MASTERS W', 11, 99, 'MASW', 'w', 'y'),
(20, 'M15', 'U16 M15', 21, 15, 'M15', 'm', 'y'),
(21, 'M14', 'U16 M14', 22, 14, 'M14', 'm', 'y'),
(22, 'M13', 'U14 M13', 23, 13, 'M13', 'm', 'y'),
(23, 'M12', 'U14 M12', 24, 12, 'M12', 'm', 'y'),
(24, 'M11', 'U12 M11', 25, 11, 'M11', 'm', 'y'),
(25, 'M10', 'U12 M10', 26, 10, 'M10', 'm', 'y'),
(26, 'M09', 'U10 M09', 27, 9, 'M09', 'm', 'y'),
(27, 'M08', 'U10 M08', 28, 8, 'M08', 'm', 'y'),
(28, 'M07', 'U10 M07', 29, 7, 'M07', 'm', 'y'),
(29, 'W15', 'U16 W15', 31, 15, 'W15', 'w', 'y'),
(30, 'W14', 'U16 W14', 32, 14, 'W14', 'w', 'y'),
(31, 'W13', 'U14 W13', 33, 13, 'W13', 'w', 'y'),
(32, 'W12', 'U14 W12', 34, 12, 'W12', 'w', 'y'),
(33, 'W11', 'U12 W11', 35, 11, 'W11', 'w', 'y'),
(34, 'W10', 'U12 W10', 36, 10, 'W10', 'w', 'y'),
(35, 'W09', 'U10 W09', 37, 9, 'W09', 'w', 'y'),
(36, 'W08', 'U10 W08', 38, 8, 'W08', 'w', 'y'),
(37, 'W07', 'U10 W07', 39, 7, 'W07', 'w', 'y'),
(38, 'MIXE', 'Männer/Frauen Mixed', 22, 99, 'MIXE', 'm', 'y'),
(39, 'U18X', 'U18 Mixed', 19, 17, 'U18X', 'm', 'y'),
(40, 'U20X', 'U20 Mixed', 20, 19, 'U20X', 'm', 'y'),
(41, 'U23X', 'U23 Mixed', 21, 22, 'U23X', 'm', 'y');