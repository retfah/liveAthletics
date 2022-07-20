-- phpMyAdmin SQL Dump
-- version 3.2.2.1
-- http://www.phpmyadmin.net
--
-- Host: localhost:3306
-- Erstellungszeit: 02. Mai 2020 um 08:28
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
-- Tabellenstruktur für Tabelle `kategorie_svm`
--

CREATE TABLE IF NOT EXISTS `kategorie_svm` (
  `xKategorie_svm` int(11) NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) NOT NULL DEFAULT '',
  `Code` varchar(5) NOT NULL DEFAULT '',
  PRIMARY KEY (`xKategorie_svm`),
  KEY `Code` (`Code`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=50 ;

--
-- Daten für Tabelle `kategorie_svm`
--

INSERT INTO `kategorie_svm` (`xKategorie_svm`, `Name`, `Code`) VALUES
(1, '29.01 Nationalliga A Männer', '29_01'),
(2, '29.02 Nationalliga A Frauen', '29_02'),
(3, '30.01 Nationalliga B Männer', '30_01'),
(4, '30.02 Nationalliga B Frauen', '30_02'),
(5, '31.01 Nationalliga C Männer', '31_01'),
(6, '31.02 Nationalliga C Frauen', '31_02'),
(7, '32.01 Promotionsliga A Männer', '32_01'),
(9, '32.03 Promotionsliga A Frauen', '32_03'),
(11, '33.01 Juniorliga Männer', '33_01'),
(13, '33.03 Juniorliga Frauen', '33_03'),
(15, '35.01 M30 und älter Männer', '35_01'),
(16, '35.02 U18 M', '35_02'),
(17, '35.03 U18 M Mehrkampf', '35_03'),
(18, '35.04 U16 M', '35_04'),
(19, '35.05 U16 M Mehrkampf', '35_05'),
(20, '35.06 U14 M', '35_06'),
(21, '35.07 U14 M Mannschaftswettkampf', '35_07'),
(22, '35.08 U12 M Mannschaftswettkampf', '35_08'),
(23, '36.01 W30 und älter Frauen', '36_01'),
(24, '36.02 U18 W', '36_02'),
(25, '36.03 U18 W Mehrkampf', '36_03'),
(26, '36.04 U16 W', '36_04'),
(27, '36.05 U16 W Mehrkampf', '36_05'),
(28, '36.06 U14 W', '36_06'),
(29, '36.07 U14 W Mannschaftswettkampf', '36_07'),
(30, '36.08 U12 W Mannschaftswettkampf', '36_08'),
(31, '36.09 Mixed Team U12 M und U12 W', '36_09'),
(36, '32.07 Promotionsliga B Männer', '32_07'),
(37, '32.08 Promotionsliga B Frauen', '32_08'),
(38, '99.01 LMM U16W', '99_01'),
(39, '99.02 LMM U16M', '99_02'),
(40, '99.03 LMM U18W', '99_03'),
(41, '99.04 LMM U18M', '99_04'),
(42, '99.05 LMM U18 Mixed', '99_05'),
(43, '99.06 LMM U20W', '99_06'),
(44, '99.07 LMM U20M', '99_07'),
(45, '99.08 LMM Frauen', '99_08'),
(46, '99.09 LMM Männer', '99_09'),
(47, '99.10 LMM Aktive Mixed', '99_10'),
(48, '99.11 LMM Seniorinnen', '99_11'),
(49, '99.12 LMM Senioren', '99_12');
