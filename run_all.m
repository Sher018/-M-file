function run_all(mode)
    % RUN_ALL Единая точка входа комплекса SC_Calculator.
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.2.2
    % Подраздел диплома: 3.6 «Главный сценарий main_calc_sc.m и интеграция модулей»
    %
    % run_all           — полный расчёт (эквивалент main_calc_sc)
    % run_all('calc')   — то же
    % run_all('test')   — верификация (verify_sc_suite)
    % run_all('both')   — расчёт, затем тесты
    % run_all('menu')   — единое меню запуска (sc_menu)
    % run_all('points') — расчёт нескольких точек КЗ (run_points)

    if nargin < 1 || isempty(mode)
        mode = 'calc';
    end

    rootDir = fileparts(mfilename('fullpath'));
    cd(rootDir);
    addpath(rootDir);
    addpath(fullfile(rootDir, 'tests'));
    sc_ensure_results_dirs(rootDir);

    if exist('OCTAVE_VERSION', 'builtin') ~= 0
        sc_octave_init();
    end

    mode = lower(strtrim(char(mode)));
    switch mode
        case {'calc', 'run', 'main', ''}
            main_calc_sc;
        case 'test'
            run_sc_tests;
        case 'both'
            main_calc_sc;
            run_sc_tests;
        case 'menu'
            sc_menu;
        case 'points'
            run_points;
        otherwise
            error('run_all: неизвестный режим "%s". Используйте calc, test, both, menu или points.', mode);
    end
end
