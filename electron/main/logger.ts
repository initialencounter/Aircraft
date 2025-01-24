import Logger from 'reggol';

Logger.targets[0].showTime = 'yyyy-MM-dd hh:mm:ss';
Logger.targets[0].label = {
  align: 'left',
};
Logger.targets[0].colors = 4

export default Logger;