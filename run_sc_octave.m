% RUN_SC_OCTAVE Запуск расчёта в GNU Octave (без MATLAB и без GUI uifigure).
%
% Из папки проекта в Octave:
%   pkg load io
%   run_sc_octave
%
% Или интерактивно: oct_sc_menu

clear;
clc;
close all;

rootDir = fileparts(mfilename('fullpath'));
cd(rootDir);
addpath(rootDir);

sc_octave_init();

main_calc_sc;
