-- phpMyAdmin SQL Dump
-- version 3.2.2.1
-- http://www.phpmyadmin.net
--
-- Host: localhost:3306
-- Erstellungszeit: 02. Mai 2020 um 08:27
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
-- Tabellenstruktur für Tabelle `rundentyp_de`
--

CREATE TABLE IF NOT EXISTS `rundentyp_de` (
  `xRundentyp` int(11) NOT NULL AUTO_INCREMENT,
  `Typ` char(2) NOT NULL DEFAULT '',
  `Name` varchar(20) NOT NULL DEFAULT '',
  `Wertung` tinyint(4) DEFAULT '0',
  `Code` char(2) NOT NULL DEFAULT '',
  PRIMARY KEY (`xRundentyp`),
  UNIQUE KEY `Name` (`Name`),
  UNIQUE KEY `Typ` (`Typ`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=11 ;

--
-- Daten für Tabelle `rundentyp_de`
--

INSERT INTO `rundentyp_de` (`xRundentyp`, `Typ`, `Name`, `Wertung`, `Code`) VALUES
(1, 'V', 'Vorlauf', 0, 'V'),
(2, 'F', 'Final', 0, 'F'),
(3, 'Z', 'Zwischenlauf', 0, 'Z'),
(5, 'Q', 'Qualifikation', 1, 'Q'),
(6, 'S', 'Serie', 0, 'S'),
(7, 'X', 'Halbfinal', 0, 'X'),
(8, 'D', 'Mehrkampf', 1, 'D'),
(9, '0', '(ohne)', 2, '0'),
(10, 'FZ', 'Zeitläufe', 1, 'FZ');
