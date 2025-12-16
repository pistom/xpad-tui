import fs from 'fs';
import { parseInfoFile, getNotesFromDirectory } from './noteUtils';

describe('parseInfoFile', () => {
  it('should parse a valid info file', () => {
    const mockContent = `width 839\nheight 463\nx 0\ny 0\nfollow_font 1\nfollow_color 1\nsticky 0\nhidden 1\nback rgb(238,238,236)\ntext rgb(255,255,255)\nfontname psudoFont Liga Mono Italic 13\ncontent content-6MKUE3`;
    const mockPath = '/mock/path/info-123456';
    jest.spyOn(fs, 'readFileSync').mockReturnValue(mockContent);

    const result = parseInfoFile(mockPath);

    expect(result).toEqual({
      width: 839,
      height: 463,
      x: 0,
      y: 0,
      followFont: true,
      followColor: true,
      sticky: false,
      hidden: true,
      backgroundColor: '#eeeeec',
      textColor: '#ffffff',
      font: 'psudoFont Liga Mono Italic 13',
      contentFile: 'content-6MKUE3',
    });
  });

  it('should return null for an invalid info file', () => {
    const mockPath = '/mock/path/info-123456';
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('File not found');
    });

    const result = parseInfoFile(mockPath);

    expect(result).toBeNull();
  });
});

describe('getNotesFromDirectory', () => {
  it('should return an array of notes from a directory', () => {
    const mockFiles = ['info-123456', 'info-654321', 'random-file.txt'];
    jest.spyOn(fs, 'readdirSync').mockReturnValue(mockFiles);
    jest.spyOn(fs, 'readFileSync').mockImplementation((filePath: string) => {
      if (filePath.includes('info-123456')) {
        return `width 839\nheight 463\nx 0\ny 0\nfollow_font 1\nfollow_color 1\nsticky 0\nhidden 0\nback rgb(238,238,236)\ntext rgb(255,255,255)\nfontname psudoFont Liga Mono Italic 13\ncontent content-6MKUE3`;
      }
      if (filePath.includes('info-654321')) {
        return `width 500\nheight 300\nx 10\ny 20\nfollow_font 0\nfollow_color 0\nsticky 1\nhidden 1\nback rgb(200,200,200)\ntext rgb(0,0,0)\nfontname AnotherFont 12\ncontent content-XYZ123`;
      }
      return '';
    });

    const result = getNotesFromDirectory('/mock/path');

    expect(result).toEqual([
      {
        width: 839,
        height: 463,
        x: 0,
        y: 0,
        followFont: true,
        followColor: true,
        sticky: false,
        hidden: false,
        backgroundColor: '#eeeeec',
        textColor: '#ffffff',
        font: 'psudoFont Liga Mono Italic 13',
        contentFile: 'content-6MKUE3',
      },
      {
        width: 500,
        height: 300,
        x: 10,
        y: 20,
        followFont: false,
        followColor: false,
        sticky: true,
        hidden: true,
        backgroundColor: '#c8c8c8',
        textColor: '#000000',
        font: 'AnotherFont 12',
        contentFile: 'content-XYZ123',
      },
    ]);
  });

  it('should return an empty array if no info files are found', () => {
    jest.spyOn(fs, 'readdirSync').mockReturnValue(['random-file.txt']);

    const result = getNotesFromDirectory('/mock/path');

    expect(result).toEqual([]);
  });
});