
import {promises as fs} from 'fs';
import { tcpToFile } from './tcpClient.js';

/**
 * Log the different 
 */
class ALGElogger {

    static async create(folder, nameAll='all.txt', nameDisplayGaz='displayGaz.txt', nameDisplayDline='displayDline.txt', nameAlgeOutput='algeOutput.txt', nameVersatileExchange='versatileExchange.txt'){
        // since we want to open files async (instead of sync (very bad idea) or with callbacks (old school), we prepare the file handles first and then call the constructor)

        const fileAll = await fs.open(folder + "\\" + nameAll, 'a+');
        const fileDisplayGaz = await fs.open(folder + "\\" + nameDisplayGaz, 'a+');
        const fileDisplayDline = await fs.open(folder + "\\" + nameDisplayDline, 'a+');
        const fileAlgeOutput = await fs.open(folder + "\\" + nameAlgeOutput, 'a+');
        const fileVersatileExchange = await fs.open(folder + "\\" + nameVersatileExchange, 'a+');

        return new ALGElogger(fileAll, fileDisplayGaz, fileDisplayDline, fileAlgeOutput, fileVersatileExchange);
    }

    constructor(fileAll, fileDisplayGaz, fileDisplayDline, fileAlgeOutput, fileVersatileExchange){

        // NOTE: in the test, I activated every possible output in the four configurations !!!

        // ALGE DisplayBoard connection options (see Net.socket.connect)
        let optDisplayGaz = {
            port: 4445,
            host: '192.168.3.101',
            keepAlive: true,
            keepAliveInitialDelay: 2000,
        }
        let optDisplayDline = {
            port: 4446,
            host: '192.168.3.101',
            keepAlive: true,
            keepAliveInitialDelay: 2000,
        }

        // ALGE Output Port
        let optAlgeOutput = {
            port: 4447,
            host: '192.168.3.101',
            keepAlive: true,
            keepAliveInitialDelay: 2000,
        }

        // ALGE Versatile Exchange connection options (see Net.socket.connect)
        let optVersatileExchange = {
            port: 4448,
            host: '192.168.3.101',
            keepAlive: true,
            keepAliveInitialDelay: 2000,
        }

        // create tcpToFile class for every output
        const oDisplayGaz = new tcpToFile(optDisplayGaz, 'displayGaz__', [fileAll, fileDisplayGaz]); // the underlines are intended to make the string as long as Dline for easier comparison
        const oDisplayDline = new tcpToFile(optDisplayDline, 'displayDline', [fileAll, fileDisplayDline]);
        const oAlgeOutput = new tcpToFile(optAlgeOutput, 'algeOutput', [fileAll, fileAlgeOutput]);
        const oVersatileExchange = new tcpToFile(optVersatileExchange, 'versatileExchange', [fileAll, fileVersatileExchange]);

    }
}
ALGElogger.create('C:\\Users\\Reto\\Documents\\Reto\\Programmieren\\liveAthletics\\Zeitmessung\\Alge Schnittstelle')