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
-- Tabellenstruktur für Tabelle `region`
--

CREATE TABLE IF NOT EXISTS `region` (
  `xRegion` int(11) NOT NULL AUTO_INCREMENT,
  `Name` varchar(50) NOT NULL DEFAULT '',
  `Anzeige` varchar(6) NOT NULL DEFAULT '',
  `Sortierwert` int(11) NOT NULL DEFAULT '0',
  `UKC` enum('y','n') DEFAULT 'n',
  PRIMARY KEY (`xRegion`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=28 ;

--
-- Daten für Tabelle `region`
--

INSERT INTO `region` (`xRegion`, `Name`, `Anzeige`, `Sortierwert`, `UKC`) VALUES
(1, 'Aargau', 'AG', 100, 'n'),
(2, 'Appenzell Ausserrhoden', 'AR', 101, 'n'),
(3, 'Appenzell Innerrhoden', 'AI', 102, 'n'),
(4, 'Basel-Landschaft', 'BL', 103, 'n'),
(5, 'Basel-Stadt', 'BS', 104, 'n'),
(6, 'Bern', 'BE', 105, 'n'),
(7, 'Freiburg', 'FR', 106, 'n'),
(8, 'Genf', 'GE', 107, 'n'),
(9, 'Glarus', 'GL', 108, 'n'),
(10, 'Graubünden', 'GR', 109, 'n'),
(11, 'Jura', 'JU', 110, 'n'),
(12, 'Luzern', 'LU', 111, 'n'),
(13, 'Neuenburg', 'NE', 112, 'n'),
(14, 'Nidwalden', 'NW', 113, 'n'),
(15, 'Obwalden', 'OW', 114, 'n'),
(16, 'Sankt Gallen', 'SG', 115, 'n'),
(17, 'Schaffhausen', 'SH', 116, 'n'),
(18, 'Schwyz', 'SZ', 117, 'n'),
(19, 'Solothurn', 'SO', 118, 'n'),
(20, 'Thurgau', 'TG', 119, 'n'),
(21, 'Tessin', 'TI', 120, 'n'),
(22, 'Uri', 'UR', 121, 'n'),
(23, 'Wallis', 'VS', 122, 'n'),
(24, 'Waadt', 'VD', 123, 'n'),
(25, 'Zug', 'ZG', 124, 'n'),
(26, 'Zürich', 'ZH', 125, 'n'),
(27, 'Liechtenstein', 'FL', 126, 'y');
