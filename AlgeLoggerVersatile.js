
import {promises as fs} from 'fs';
import { tcpToFile } from './tcpClient.js';

/**
 * Log the different 
 */
class ALGElogger {

    static async create(folder, nameVersatileExchange='versatileExchange.txt'){
        // since we want to open files async (instead of sync (very bad idea) or with callbacks (old school), we prepare the file handles first and then call the constructor)

        const fileVersatileExchange = await fs.open(folder + "\\" + nameVersatileExchange, 'a+');

        return new ALGElogger(fileVersatileExchange);
    }

    constructor(fileVersatileExchange){

        // NOTE: in the test, I activated every possible output in the four configurations !!!

        // ALGE Versatile Exchange connection options (see Net.socket.connect)
        let optVersatileExchange = {
            port: 4446,
            host: '127.0.0.1',
            keepAlive: true,
            keepAliveInitialDelay: 2000,
        }

        // create tcpToFile class for every output
        const oVersatileExchange = new tcpToFile(optVersatileExchange, 'versatileExchange', [fileVersatileExchange]);

    }
}
ALGElogger.create('C:\\Users\\Reto\\Desktop\\alge')