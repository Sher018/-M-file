function sc_ensure_results_dirs(rootDir)
    % SC_ENSURE_RESULTS_DIRS Создание каталогов results при первом запуске.
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.2.2
    % Подраздел диплома: 3.6 «Главный сценарий main_calc_sc.m и интеграция модулей»
    %
    % sc_ensure_results_dirs()
    % sc_ensure_results_dirs(rootDir) — корень проекта (по умолчанию — каталог вызывающего файла)

    if nargin < 1 || isempty(rootDir)
        rootDir = fileparts(mfilename('fullpath'));
    end

    dirs = {'results', fullfile('results', 'figures'), fullfile('results', 'docs')};
    for k = 1:numel(dirs)
        p = fullfile(rootDir, dirs{k});
        if ~exist(p, 'dir')
            mkdir(p);
        end
    end
end
