-- phpMyAdmin SQL Dump
-- version 3.2.2.1
-- http://www.phpmyadmin.net
--
-- Host: localhost:3306
-- Erstellungszeit: 02. Mai 2020 um 08:25
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
-- Tabellenstruktur für Tabelle `disziplin_fr`
--

CREATE TABLE IF NOT EXISTS `disziplin_fr` (
  `xDisziplin` int(11) NOT NULL AUTO_INCREMENT,
  `Kurzname` varchar(15) NOT NULL DEFAULT '',
  `Name` varchar(40) NOT NULL DEFAULT '',
  `Anzeige` int(11) NOT NULL DEFAULT '1',
  `Seriegroesse` int(4) NOT NULL DEFAULT '0',
  `Staffellaeufer` int(11) DEFAULT NULL,
  `Typ` int(11) NOT NULL DEFAULT '0',
  `Appellzeit` time NOT NULL DEFAULT '00:00:00',
  `Stellzeit` time NOT NULL DEFAULT '00:00:00',
  `Strecke` float NOT NULL DEFAULT '0',
  `Code` int(11) NOT NULL DEFAULT '0',
  `xOMEGA_Typ` int(11) NOT NULL DEFAULT '0',
  `aktiv` enum('y','n') NOT NULL DEFAULT 'y',
  PRIMARY KEY (`xDisziplin`),
  UNIQUE KEY `Kurzname` (`Kurzname`),
  KEY `Anzeige` (`Anzeige`),
  KEY `Staffel` (`Staffellaeufer`),
  KEY `Code` (`Code`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=221 ;

--
-- Daten für Tabelle `disziplin_fr`
--

INSERT INTO `disziplin_fr` (`xDisziplin`, `Kurzname`, `Name`, `Anzeige`, `Seriegroesse`, `Staffellaeufer`, `Typ`, `Appellzeit`, `Stellzeit`, `Strecke`, `Code`, `xOMEGA_Typ`, `aktiv`) VALUES
(38, '50', '50 m', 10, 6, 0, 2, '01:00:00', '00:15:00', 50, 10, 1, 'y'),
(39, '55', '55 m', 20, 6, 0, 2, '01:00:00', '00:15:00', 55, 20, 1, 'y'),
(40, '60', '60 m', 30, 6, 0, 2, '01:00:00', '00:15:00', 60, 30, 1, 'y'),
(41, '80', '80 m', 35, 6, 0, 1, '01:00:00', '00:15:00', 80, 35, 1, 'y'),
(42, '100', '100 m', 40, 86, 0, 1, '01:00:00', '00:15:00', 100, 40, 1, 'y'),
(43, '150', '150 m', 48, 6, 0, 1, '01:00:00', '00:15:00', 150, 48, 1, 'y'),
(44, '200', '200 m', 50, 6, 0, 1, '01:00:00', '00:15:00', 200, 50, 1, 'y'),
(45, '300', '300 m', 60, 6, 0, 2, '01:00:00', '00:15:00', 300, 60, 1, 'y'),
(46, '400', '400 m', 70, 6, 0, 2, '01:00:00', '00:15:00', 400, 70, 1, 'y'),
(47, '600', '600 m', 80, 12, 0, 7, '01:00:00', '00:15:00', 600, 80, 1, 'y'),
(48, '800', '800 m', 90, 6, 0, 7, '01:00:00', '00:15:00', 800, 90, 1, 'y'),
(49, '1000', '1000 m', 100, 15, 0, 7, '01:00:00', '00:15:00', 1000, 100, 1, 'y'),
(50, '1500', '1500 m', 110, 12, 0, 7, '01:00:00', '00:15:00', 1500, 110, 1, 'y'),
(51, '1MILE', '1 mile', 120, 15, 0, 7, '01:00:00', '00:15:00', 1609, 120, 1, 'y'),
(52, '2000', '2000 m', 130, 15, 0, 7, '01:00:00', '00:15:00', 2000, 130, 1, 'y'),
(53, '3000', '3000 m', 140, 15, 0, 7, '01:00:00', '00:15:00', 3000, 140, 1, 'y'),
(54, '5000', '5000 m', 160, 15, 0, 7, '01:00:00', '00:15:00', 5000, 160, 1, 'y'),
(55, '10000', '10 000 m', 170, 20, 0, 7, '01:00:00', '00:15:00', 10000, 170, 1, 'y'),
(56, '20000', '20 000 m', 180, 20, 0, 7, '01:00:00', '00:15:00', 20000, 180, 1, 'y'),
(57, '1HEURE', '1 heure', 171, 620, 0, 7, '01:00:00', '00:15:00', 1, 182, 1, 'y'),
(58, '25000', '25 000 m', 181, 20, 0, 7, '01:00:00', '00:15:00', 25000, 181, 1, 'y'),
(59, '30000', '30 000 m', 182, 20, 0, 7, '01:00:00', '00:15:00', 30000, 195, 1, 'y'),
(61, 'DEMIMARATHON', 'Demimarathon', 183, 20, 0, 7, '01:00:00', '00:15:00', 0, 190, 1, 'y'),
(62, 'MARATHON', 'Marathon', 184, 20, 0, 7, '01:00:00', '00:15:00', 0, 200, 1, 'y'),
(64, '50H106.7', '50 m haies 106.7', 232, 6, 0, 1, '01:00:00', '00:15:00', 50, 232, 4, 'y'),
(65, '50H99.1', '50 m haies 99.1', 233, 6, 0, 2, '01:00:00', '00:15:00', 50, 233, 4, 'y'),
(66, '50H91.4', '50 m haies 91.4', 234, 6, 0, 2, '01:00:00', '00:15:00', 50, 234, 4, 'y'),
(67, '50H84.0', '50 m haies 84.0', 235, 6, 0, 2, '01:00:00', '00:15:00', 50, 235, 4, 'y'),
(68, '50H76.2', '50 m haies 76.2  U18 W', 236, 6, 0, 2, '01:00:00', '00:15:00', 50, 236, 4, 'y'),
(69, '60H106.7', '60 m haies 106.7', 241, 6, 0, 2, '01:00:00', '00:15:00', 60, 252, 4, 'y'),
(70, '60H99.1', '60 m haies 99.1', 242, 6, 0, 2, '01:00:00', '00:15:00', 60, 253, 4, 'y'),
(71, '60H91.4', '60 m haies 91.4', 243, 6, 0, 2, '01:00:00', '00:15:00', 60, 254, 4, 'y'),
(72, '60H84.0', '60 m haies 84.0', 244, 6, 0, 2, '01:00:00', '00:15:00', 60, 255, 4, 'y'),
(73, '60H76.2', '60 m haies 76.2  U18 W', 245, 6, 0, 2, '01:00:00', '00:15:00', 60, 256, 4, 'y'),
(74, '80H76.2', '80 m haies 76.2', 264, 6, 0, 1, '01:00:00', '00:15:00', 80, 258, 4, 'y'),
(75, '100H84.0', '100 m haies 84.0', 266, 6, 0, 1, '01:00:00', '00:15:00', 100, 261, 4, 'y'),
(76, '100H76.2', '100 m haies 76.2', 267, 6, 0, 1, '01:00:00', '00:15:00', 100, 259, 4, 'y'),
(77, '110H106.7', '110 m haies 106.7', 268, 6, 0, 1, '01:00:00', '00:15:00', 110, 271, 4, 'y'),
(78, '110H99.1', '110 m haies 99.1', 269, 6, 0, 1, '01:00:00', '00:15:00', 110, 269, 4, 'y'),
(79, '110H91.4', '110 m haies 91.4', 270, 6, 0, 1, '01:00:00', '00:15:00', 110, 268, 4, 'y'),
(80, '200H', '200 m haies', 280, 6, 0, 1, '01:00:00', '00:15:00', 200, 280, 4, 'y'),
(81, '300H84.0', '300 m haies 84.0', 290, 6, 0, 2, '01:00:00', '00:15:00', 300, 290, 4, 'y'),
(82, '300H76.2', '300 m haies 76.2', 291, 6, 0, 2, '01:00:00', '00:15:00', 300, 291, 4, 'y'),
(83, '400H91.4', '400 m haies 91.4', 298, 6, 0, 2, '01:00:00', '00:15:00', 400, 301, 4, 'y'),
(84, '400H76.2', '400 m haies 76.2', 301, 6, 0, 2, '01:00:00', '00:15:00', 400, 298, 4, 'y'),
(85, '1500ST', '1500 m Steeple', 302, 6, 0, 7, '01:00:00', '00:15:00', 1500, 209, 6, 'y'),
(86, '2000ST', '2000 m Steeple', 303, 6, 0, 7, '01:00:00', '00:15:00', 2000, 210, 6, 'y'),
(87, '3000ST', '3000 m Steeple', 304, 6, 0, 7, '01:00:00', '00:15:00', 3000, 220, 6, 'y'),
(88, '5XLIBRE', '5x libre', 395, 6, 5, 3, '01:00:00', '00:15:00', 5, 497, 1, 'y'),
(89, '5X80', '5x80 m', 396, 6, 5, 3, '01:00:00', '00:15:00', 400, 498, 1, 'y'),
(90, '6XLIBRE', '6x libre', 394, 6, 6, 3, '01:00:00', '00:15:00', 6, 499, 1, 'y'),
(91, '4X100', '4x100 m', 397, 6, 4, 3, '01:00:00', '00:15:00', 400, 560, 1, 'y'),
(92, '4X200', '4x200 m', 398, 6, 4, 3, '01:00:00', '00:15:00', 800, 570, 1, 'y'),
(93, '4X400', '4x400 m', 399, 6, 4, 3, '01:00:00', '00:15:00', 1600, 580, 1, 'y'),
(94, '3X800', '3x800 m', 400, 6, 3, 3, '01:00:00', '00:15:00', 2400, 589, 1, 'y'),
(95, '4X800', '4x800 m', 401, 6, 4, 3, '01:00:00', '00:15:00', 3200, 590, 1, 'y'),
(96, '3X1000', '3x1000 m', 402, 6, 3, 3, '01:00:00', '00:15:00', 3000, 595, 1, 'y'),
(97, '4X1500', '4x1500 m', 403, 6, 4, 3, '01:00:00', '00:15:00', 6000, 600, 1, 'y'),
(98, 'OLYMPISCHE', 'Olympische', 404, 12, 4, 3, '01:00:00', '00:15:00', 0, 601, 1, 'y'),
(99, 'AMERICAINE', 'Américaine', 405, 12, 3, 3, '01:00:00', '00:15:00', 0, 602, 1, 'y'),
(100, 'HAUTEUR', 'Hauteur', 310, 15, 0, 6, '01:00:00', '00:20:00', 0, 310, 1, 'y'),
(101, 'PERCHE', 'Perche', 320, 15, 0, 6, '01:30:00', '00:40:00', 0, 320, 1, 'y'),
(102, 'LONGUEUR', 'Longueur', 330, 15, 0, 4, '01:00:00', '00:20:00', 0, 330, 1, 'y'),
(103, 'TRIPLE', 'Triple', 340, 15, 0, 4, '01:00:00', '00:20:00', 0, 340, 1, 'y'),
(104, 'POIDS7.26', 'Poids 7.26 kg', 347, 15, 0, 8, '01:00:00', '00:20:00', 0, 351, 1, 'y'),
(105, 'POIDS6.00', 'Poids 6.00 kg', 348, 15, 0, 8, '01:00:00', '00:20:00', 0, 348, 1, 'y'),
(106, 'POIDS5.00', 'Poids 5.00 kg', 349, 15, 0, 8, '01:00:00', '00:20:00', 0, 347, 1, 'y'),
(107, 'POIDS4.00', 'Poids 4.00 kg', 350, 15, 0, 8, '01:00:00', '00:20:00', 0, 349, 1, 'y'),
(108, 'POIDS3.00', 'Poids 3.00 kg', 352, 15, 0, 8, '01:00:00', '00:20:00', 0, 352, 1, 'y'),
(109, 'POIDS2.50', 'Poids 2.50 kg', 353, 15, 0, 8, '01:00:00', '00:20:00', 0, 353, 1, 'y'),
(110, 'DISQUE2.00', 'Disque 2.00 kg', 356, 615, 0, 8, '01:00:00', '00:20:00', 0, 361, 1, 'y'),
(111, 'DISQUE1.75', 'Disque 1.75 kg', 357, 15, 0, 8, '01:00:00', '00:20:00', 0, 359, 1, 'y'),
(112, 'DISQUE1.50', 'Disque 1.50 kg', 358, 15, 0, 8, '01:00:00', '00:20:00', 0, 358, 1, 'y'),
(113, 'DISQUE1.00', 'Disque 1.00 kg', 359, 15, 0, 8, '01:00:00', '00:20:00', 0, 357, 1, 'y'),
(114, 'DISQUE0.75', 'Disque 0.75 kg', 361, 15, 0, 8, '01:00:00', '00:20:00', 0, 356, 1, 'y'),
(115, 'MARTEAU7.26', 'Marteau 7.26 kg', 375, 15, 0, 8, '01:00:00', '00:20:00', 0, 381, 1, 'y'),
(116, 'MARTEAU6.00', 'Marteau 6.00 kg', 376, 15, 0, 8, '01:00:00', '00:20:00', 0, 378, 1, 'y'),
(117, 'MARTEAU5.00', 'Marteau 5.00 kg', 377, 15, 0, 8, '01:00:00', '00:20:00', 0, 377, 1, 'y'),
(118, 'MARTEAU4.00', 'Marteau 4.00 kg', 378, 15, 0, 8, '01:00:00', '00:20:00', 0, 376, 1, 'y'),
(119, 'MARTEAU3.00', 'Marteau 3.00 kg', 381, 15, 0, 8, '01:00:00', '00:20:00', 0, 375, 1, 'y'),
(120, 'JAVELOT800', 'Javelot 800 gr', 387, 15, 0, 8, '01:00:00', '00:20:00', 0, 391, 1, 'y'),
(121, 'JAVELOT700', 'Javelot 700 gr', 388, 15, 0, 8, '01:00:00', '00:20:00', 0, 389, 1, 'y'),
(122, 'JAVELOT600', 'Javelot 600 gr', 389, 15, 0, 8, '01:00:00', '00:20:00', 0, 388, 1, 'y'),
(123, 'JAVELOT400', 'Javelot 400 gr', 391, 15, 0, 8, '01:00:00', '00:20:00', 0, 387, 1, 'y'),
(124, 'BALLE200', 'Balle 200 gr', 392, 15, 0, 8, '01:00:00', '00:20:00', 0, 386, 1, 'y'),
(125, '5ATHLON_W_U20WI', 'Pentathlon W / U20 W Indoor', 408, 6, 0, 9, '01:00:00', '00:15:00', 5, 394, 1, 'y'),
(126, '5ATHLON_U18W_I', 'Pentathlon U18 W Indoor', 409, 6, 0, 9, '01:00:00', '00:15:00', 5, 395, 1, 'y'),
(127, '7ATHLON_M_I', 'Heptathlon M Indoor', 413, 6, 0, 9, '01:00:00', '00:15:00', 7, 396, 1, 'y'),
(128, '7ATHLON_U20M_I', 'Heptathlon U20 M Indoor', 414, 6, 0, 9, '01:00:00', '00:15:00', 7, 397, 1, 'y'),
(129, '7ATHLON_U18M_I', 'Heptathlon U18 M Indoor', 415, 6, 0, 9, '01:00:00', '00:15:00', 7, 398, 1, 'y'),
(130, '10ATHLON_M', 'Décathlon M', 434, 6, 0, 9, '01:00:00', '00:15:00', 10, 410, 1, 'y'),
(131, '10ATHLON_U20M', 'Décathlon U20 M', 435, 6, 0, 9, '01:00:00', '00:15:00', 10, 411, 1, 'y'),
(132, '10ATHLON_U18M', 'Décathlon U18 M', 436, 6, 0, 9, '01:00:00', '00:15:00', 10, 412, 1, 'y'),
(133, '10ATHLON_W', 'Décathlon W', 437, 6, 0, 9, '01:00:00', '00:15:00', 10, 413, 1, 'y'),
(134, '7ATHLON', 'Heptathlon', 430, 6, 0, 9, '01:00:00', '00:15:00', 7, 400, 1, 'y'),
(135, '7ATHLON_U18W', 'Heptathlon U18 W', 431, 6, 0, 9, '01:00:00', '00:15:00', 7, 401, 1, 'y'),
(136, '6ATHLON_U16M', 'Hexathlon U16 M', 429, 6, 0, 9, '01:00:00', '00:15:00', 6, 402, 1, 'y'),
(137, '5ATHLON_U16W', 'Pentathlon U16 W', 426, 6, 0, 9, '01:00:00', '00:15:00', 5, 399, 1, 'y'),
(138, 'UKC', 'UBS Kids Cup', 439, 6, 0, 9, '01:00:00', '00:15:00', 3, 408, 1, 'y'),
(139, 'MILEWALK', 'Mile walk', 450, 50, 0, 7, '01:00:00', '00:15:00', 1609, 415, 5, 'y'),
(140, '3000WALK', '3000 m walk', 452, 50, 0, 7, '01:00:00', '00:15:00', 3000, 420, 5, 'y'),
(141, '5000WALK', '5000 m walk', 453, 50, 0, 7, '01:00:00', '00:15:00', 5000, 430, 5, 'y'),
(142, '10000WALK', '10000 m walk', 454, 50, 0, 7, '01:00:00', '00:15:00', 10000, 440, 5, 'y'),
(143, '20000WALK', '20000 m walk', 455, 50, 0, 7, '01:00:00', '00:15:00', 20000, 450, 5, 'y'),
(144, '50000WALK', '50000 m walk', 456, 50, 0, 7, '01:00:00', '00:15:00', 50000, 460, 5, 'y'),
(145, '3KMWALK', '3 km walk', 470, 50, 0, 7, '01:00:00', '00:15:00', 3000, 470, 5, 'y'),
(146, '5KMWALK', '5 km walk', 480, 50, 0, 7, '01:00:00', '00:15:00', 5000, 480, 5, 'y'),
(147, '10KMWALK', '10 km walk', 490, 50, 0, 7, '01:00:00', '00:15:00', 10000, 490, 5, 'y'),
(150, '20KMWALK', '20 km walk', 500, 50, 0, 7, '01:00:00', '00:15:00', 20000, 500, 5, 'y'),
(152, '35KMWALK', '35 km walk', 530, 50, 0, 7, '01:00:00', '00:15:00', 35000, 530, 5, 'y'),
(154, '50KMWALK', '50 km walk', 550, 50, 0, 7, '01:00:00', '00:15:00', 50000, 550, 5, 'y'),
(156, '10KM', '10 km', 440, 650, 0, 7, '01:00:00', '00:15:00', 10000, 491, 1, 'y'),
(157, '15KM', '15 km', 441, 50, 0, 7, '01:00:00', '00:15:00', 15000, 494, 1, 'y'),
(158, '20KM', '20 km', 442, 50, 0, 7, '01:00:00', '00:15:00', 20000, 501, 1, 'y'),
(159, '25KM', '25 km', 443, 50, 0, 7, '01:00:00', '00:15:00', 25000, 505, 1, 'y'),
(160, '30KM', '30 km', 444, 50, 0, 7, '01:00:00', '00:15:00', 30000, 511, 1, 'y'),
(162, '1HWALK', '1 h  walk', 555, 50, 0, 7, '01:00:00', '00:15:00', 1, 555, 5, 'y'),
(163, '2HWALK', '2 h  walk', 556, 50, 0, 7, '01:00:00', '00:15:00', 2, 556, 5, 'y'),
(164, '100KMWALK', '100 km walk', 457, 50, 0, 7, '01:00:00', '00:15:00', 100000, 559, 5, 'y'),
(165, 'BALLE80', 'Balle 80 gr', 393, 15, 0, 8, '01:00:00', '00:20:00', 0, 385, 1, 'y'),
(166, '300H91.4', '300 m haies 91.4', 289, 6, 0, 2, '01:00:00', '00:15:00', 300, 289, 4, 'y'),
(167, '...ATHLON', '...athlon', 799, 6, 0, 9, '01:00:00', '00:15:00', 4, 799, 1, 'y'),
(168, '75', '75 m', 31, 6, 0, 1, '01:00:00', '00:15:00', 75, 31, 1, 'y'),
(169, '50H68.6', '50 m haies 68.6', 240, 6, 0, 2, '01:00:00', '00:15:00', 50, 237, 1, 'y'),
(170, '60H68.6', '60 m haies 68.6', 252, 6, 0, 2, '01:00:00', '00:15:00', 60, 257, 1, 'y'),
(171, '80H84.0', '80 m haies 84.0', 263, 6, 0, 1, '01:00:00', '00:15:00', 80, 260, 1, 'y'),
(172, '80H68.6', '80 m haies 68.6', 265, 6, 0, 1, '01:00:00', '00:15:00', 80, 262, 1, 'y'),
(173, '300H68.6', '300 m haies 68.6', 292, 6, 0, 2, '01:00:00', '00:15:00', 300, 295, 1, 'y'),
(174, 'JAVELOT500', 'Javelot 500 gr', 390, 15, 0, 8, '01:00:00', '00:20:00', 0, 390, 1, 'y'),
(175, '5ATHLON_M', 'Pentathlon M', 418, 6, 0, 9, '01:00:00', '00:15:00', 5, 392, 1, 'y'),
(176, '5ATHLON_U20M', 'Pentathlon U20 M', 420, 6, 0, 9, '01:00:00', '00:15:00', 5, 393, 1, 'y'),
(177, '5ATHLON_U18M', 'Pentathlon U18 M', 421, 6, 0, 9, '01:00:00', '00:15:00', 5, 405, 1, 'y'),
(178, '5ATHLON_F', 'Pentathlon F', 423, 6, 0, 9, '01:00:00', '00:15:00', 5, 416, 1, 'y'),
(180, '5ATHLON_U18F', 'Pentathlon U18 F', 425, 6, 0, 9, '01:00:00', '00:15:00', 5, 418, 1, 'y'),
(181, '10ATHLON_MASTER', 'Décathlon Master', 438, 6, 0, 9, '01:00:00', '00:15:00', 10, 414, 1, 'y'),
(182, '2000WALK', '2000 m walk', 451, 50, 0, 7, '01:00:00', '00:15:00', 2000, 419, 1, 'y'),
(183, '...COURS', '...cours', 796, 6, 0, 9, '01:00:00', '00:15:00', 4, 796, 1, 'y'),
(184, '...LONGUEUR', '...longueur', 797, 6, 0, 9, '01:00:00', '00:20:00', 4, 797, 1, 'y'),
(185, '...LANCER', '...lancer', 798, 6, 0, 9, '01:00:00', '00:20:00', 4, 798, 1, 'y'),
(186, 'LONGUEUR Z', 'Longueur (zone)', 331, 15, 0, 5, '01:00:00', '00:20:00', 0, 331, 1, 'y'),
(187, '50H76.2U16', '50 m haies 76.2  U16W/U14M', 237, 6, 0, 2, '01:00:00', '00:15:00', 50, 246, 4, 'y'),
(188, '50H76.2U14', '50 m haies 76.2  U14 W (In)', 238, 6, 0, 2, '01:00:00', '00:15:00', 50, 247, 4, 'y'),
(189, '50H60-76.2', '50 m haies 60-76.2 U12 (In)', 239, 6, 0, 2, '01:00:00', '00:15:00', 50, 248, 4, 'y'),
(190, '60H76.2U16', '60 m haies 76.2  U16W/U14M', 247, 6, 0, 2, '01:00:00', '00:15:00', 60, 275, 4, 'y'),
(191, '60H76.2U14I', '60 m haies 76.2  U14W (In)', 248, 6, 0, 2, '01:00:00', '00:15:00', 60, 276, 4, 'y'),
(192, '60H60-76.2', '60 m haies 60-76.2  U12 (In)', 250, 6, 0, 2, '01:00:00', '00:15:00', 60, 277, 4, 'y'),
(193, '60H76.2U14O', '60 m haies 76.2  U14 W (Out)', 251, 6, 0, 2, '01:00:00', '00:15:00', 60, 278, 4, 'y'),
(194, '60H60-76.2U12', '60 m haies 60-76.2 U12', 254, 6, 0, 2, '01:00:00', '00:15:00', 60, 279, 4, 'y'),
(195, '5ATHLON_U16M', 'Athlon U16 M', 422, 6, 0, 9, '01:00:00', '00:15:00', 5, 406, 1, 'y'),
(196, '5ATHLON_U18M_I', 'Pentathlon U18 M Indoor', 406, 6, 0, 9, '01:00:00', '00:15:00', 5, 424, 1, 'y'),
(197, '5ATHLON_U23M', 'Pentathlon U23 M', 419, 6, 0, 9, '01:00:00', '00:15:00', 5, 407, 1, 'y'),
(198, '5ATHLON_U20W', 'Pentathlon U20 W', 424, 6, 0, 9, '01:00:00', '00:15:00', 5, 417, 1, 'y'),
(199, '5ATHLON_U16M_I', 'Pentathlon U16 M Indoor', 407, 6, 0, 9, '01:00:00', '00:15:00', 5, 425, 1, 'y'),
(200, '5ATHLON_U16W_I', 'Pentathlon U16 w Indoor', 410, 6, 0, 9, '01:00:00', '00:15:00', 5, 426, 1, 'y'),
(201, '8ATHLON_U18M', 'Octathlon U18 M', 433, 6, 0, 9, '01:00:00', '00:15:00', 5, 427, 1, 'y'),
(202, 'Relais suédois', 'Relais suédois', 404, 12, 4, 3, '01:00:00', '00:15:00', 0, 603, 1, 'y'),
(203, 'perche-long', 'perche en longueur', 325, 15, 0, 5, '01:00:00', '00:20:00', 0, 332, 1, 'y'),
(204, 'lancer-rotation', 'lancer en rotation', 365, 15, 0, 8, '01:00:00', '00:20:00', 0, 354, 1, 'y'),
(206, 'LMMU16W', 'CMEA U16 W', 901, 6, 0, 9, '01:00:00', '00:15:00', 4, 901, 1, 'y'),
(207, 'LMMU16M', 'CMEA U16 M', 902, 6, 0, 9, '01:00:00', '00:15:00', 5, 902, 1, 'y'),
(208, 'LMMU18W', 'CMEA U18 W', 903, 6, 0, 9, '01:00:00', '00:15:00', 4, 903, 1, 'y'),
(209, 'LMMU18M', 'CMEA U18 M', 904, 6, 0, 9, '01:00:00', '00:15:00', 5, 904, 1, 'y'),
(210, 'LMMU18X', 'CMEA U18 mixtes', 905, 6, 0, 9, '01:00:00', '00:15:00', 5, 905, 1, 'y'),
(211, 'LMMU20W', 'CMEA U20 W', 906, 6, 0, 9, '01:00:00', '00:15:00', 4, 906, 1, 'y'),
(212, 'LMMU20M', 'CMEA U20 M', 907, 6, 0, 9, '01:00:00', '00:15:00', 5, 907, 1, 'y'),
(213, 'LMMWOM', 'CMEA Femmes', 908, 6, 0, 9, '01:00:00', '00:15:00', 4, 908, 1, 'y'),
(214, 'LMMMAN', 'CMEA Hommes', 909, 6, 0, 9, '01:00:00', '00:15:00', 5, 909, 1, 'y'),
(215, 'LMMMIX', 'CMEA Mixtes', 910, 6, 0, 9, '01:00:00', '00:15:00', 5, 910, 1, 'y'),
(216, 'LMMMASW', 'CMEA Seniors W30+', 911, 6, 0, 9, '01:00:00', '00:15:00', 4, 911, 1, 'y'),
(217, 'LMMMASM', 'CMEA Seniors M30+', 912, 6, 0, 9, '01:00:00', '00:15:00', 5, 912, 1, 'y'),
(218, '400H84.0', '400 m haies 84.0', 299, 6, 0, 2, '01:00:00', '00:15:00', 400, 820, 4, 'y'),
(219, 'POIDS2.00', 'Poids 2.00 kg', 354, 15, 0, 8, '01:00:00', '00:20:00', 0, 355, 1, 'y'),
(220, 'MARTEAU2.00', 'Marteau 2.00 kg', 382, 15, 0, 8, '01:00:00', '00:20:00', 0, 374, 1, 'y');