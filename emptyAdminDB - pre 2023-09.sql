-- MySQL Script generated by MySQL Workbench
-- 01/02/22 09:03:56
-- Model: New Model    Version: 1.0
-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='TRADITIONAL,ALLOW_INVALID_DATES';

-- -----------------------------------------------------
-- Schema athletica_old
-- -----------------------------------------------------
-- -----------------------------------------------------
-- Schema athletica2
-- -----------------------------------------------------
-- New athletica database
-- -----------------------------------------------------
-- Schema athletica2_admin
-- -----------------------------------------------------
-- Add here the following tables:
-- -  all the base-data tables like licensed athletes, clubs, team and their performances --> this data will be copied to the specific meeting-DB as soon as an athlete/club/team is registered
-- -  probably add here a table for user accounts, when they shall be local and not transferred to slaves; so far the local admin account is simply set in a config file.
-- -----------------------------------------------------
-- Schema athletica3
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Table `meetings`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `meetings` (
  `xMeeting` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(75) NOT NULL DEFAULT '',
  `shortname` VARCHAR(10) NOT NULL COMMENT 'The shortname used for the database name and to identify the meeting. It is the same on master and slave and this name is the one stored in the Client-cookie (if needed). Thereby transferring a session from the master to a slave is easier, when the meeting identificator does not change',
  `code` VARCHAR(50) NOT NULL,
  `active` TINYINT(1) NOT NULL COMMENT 'is this meeting active (i.e. should the rooms get loaded)',
  `isSlave` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'is this the master, i.e. does is store incoming data other than those from the master',
  `masterAddress` VARCHAR(100) NOT NULL DEFAULT '',
  `masterUsername` VARCHAR(45) NOT NULL DEFAULT 'default' COMMENT 'the username to log in on the masterserver; not implemented yet',
  `masterPassword` VARCHAR(45) NOT NULL DEFAULT '' COMMENT 'the passwort to log in on the masterserver; not implemented yet',
  PRIMARY KEY (`xMeeting`),
  UNIQUE INDEX `shortname_UNIQUE` (`shortname` ASC))
ENGINE = InnoDB
COMMENT = 'Storing the meetings available in this mysql-instance. Every meeting has its own database in thius same mysql-instance. The DB of the meeting is always called athletica2_%shortname%.\nThere is no long name in this DB, as this is given only in the meeting DB itself. This separation is important, since changes in the meeting-specific DB are sent to all slaves, while changes in this table are not.\n\nIn the future, we could add here username and password for the meeting-DB, if needed.\nTODO: master.... should be its own table to allow for multiple masters per competition';


-- -----------------------------------------------------
-- Table `baseAccount`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `baseAccount` (
  `account_code` VARCHAR(30) NOT NULL DEFAULT '',
  `account_name` VARCHAR(255) NOT NULL DEFAULT '',
  `account_short` VARCHAR(255) NOT NULL DEFAULT '',
  `account_type` VARCHAR(100) NOT NULL DEFAULT '',
  `lg` VARCHAR(100) NOT NULL DEFAULT '',
  INDEX `account_code` (`account_code` ASC),
  UNIQUE INDEX `account_code_UNIQUE` (`account_code` ASC))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `baseAthletes`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `baseAthletes` (
  `id_athlete` INT(11) NOT NULL AUTO_INCREMENT,
  `license` INT(11) NOT NULL DEFAULT '0',
  `license_paid` TINYINT(1) NOT NULL DEFAULT 1,
  `license_cat` VARCHAR(4) NOT NULL DEFAULT '',
  `lastname` VARCHAR(100) NOT NULL DEFAULT '',
  `firstname` VARCHAR(100) NOT NULL DEFAULT '',
  `sex` ENUM('m', 'w') NOT NULL DEFAULT 'm',
  `nationality` CHAR(3) NOT NULL DEFAULT '',
  `account_code` VARCHAR(30) NOT NULL DEFAULT '',
  `second_account_code` VARCHAR(30) NOT NULL DEFAULT '',
  `birth_date` DATE NOT NULL DEFAULT '1900-01-01',
  `account_info` VARCHAR(150) NOT NULL DEFAULT '',
  PRIMARY KEY (`id_athlete`),
  INDEX `account_code` (`account_code` ASC),
  INDEX `second_account_code` (`second_account_code` ASC),
  INDEX `license` (`license` ASC),
  INDEX `lastname` (`lastname` ASC),
  INDEX `firstname` (`firstname` ASC))
ENGINE = InnoDB
AUTO_INCREMENT = 38679
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `users`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `xUser` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(45) NOT NULL,
  `password` CHAR(60) NOT NULL,
  `passwordState` TINYINT NOT NULL DEFAULT 0 COMMENT 'used to invalidate passwords or to note that the password is initial and needs to be changed on the first login.\n0: everythink ok.\n-1: to be changed on first login, because it is the initial password\n-2: password was invalidated for some other reason. Also needs to be changed on the first login.',
  PRIMARY KEY (`xUser`),
  UNIQUE INDEX `username_UNIQUE` (`username` ASC))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `usersGroups`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `usersGroups` (
  `xUser` INT UNSIGNED NOT NULL,
  `group` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`xUser`, `group`),
  CONSTRAINT `usersGroups_xUser`
    FOREIGN KEY (`xUser`)
    REFERENCES `users` (`xUser`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `usersMeetings`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `usersMeetings` (
  `xUser` INT UNSIGNED NOT NULL,
  `xMeeting` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`xUser`, `xMeeting`),
  INDEX `xMeeting_idx` (`xMeeting` ASC),
  CONSTRAINT `usersMeetings_xMeeting`
    FOREIGN KEY (`xMeeting`)
    REFERENCES `meetings` (`xMeeting`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `usersMeetings_xUser`
    FOREIGN KEY (`xUser`)
    REFERENCES `users` (`xUser`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
