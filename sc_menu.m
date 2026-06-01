function sc_menu()
    % SC_MENU Единое текстовое меню запуска комплекса SC_Calculator.
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.3.0
    % Подраздел диплома: 3.6 «Главный сценарий и интеграция модулей»
    %
    % Работает в MATLAB и GNU Octave. Запуск:  sc_menu

    rootDir = fileparts(mfilename('fullpath'));
    cd(rootDir);
    addpath(rootDir);
    if exist(fullfile(rootDir, 'tests'), 'dir')
        addpath(fullfile(rootDir, 'tests'));
    end

    isOct = exist('OCTAVE_VERSION', 'builtin') ~= 0;
    if isOct
        try
            sc_octave_init();
        catch err
            fprintf('Предупреждение Octave: %s\n', err.message);
        end
    end

    while true
        print_menu(isOct);
        choice = strtrim(input('Ваш выбор: ', 's'));
        fprintf('\n');
        switch choice
            case '1'
                safe_run(@() main_calc_sc(ask_file(rootDir)));
            case '2'
                safe_run(@() run_points(ask_file(rootDir)));
            case '3'
                if isOct
                    fprintf('GUI доступен только в MATLAB. Используйте пункт 1 или 2.\n');
                else
                    safe_run(@() sc_calculator_gui());
                end
            case '4'
                safe_run(@() draw_structure_scheme());
            case '5'
                safe_run(@() run_sc_tests());
            case '6'
                name = strtrim(input('Имя шаблона [network_parameters_template.csv]: ', 's'));
                if isempty(name)
                    safe_run(@() make_template());
                else
                    safe_run(@() make_template(name));
                end
            case {'0', 'q', 'Q', 'exit', ''}
                fprintf('Выход из меню.\n');
                return;
            otherwise
                fprintf('Неизвестный пункт «%s». Повторите выбор.\n', choice);
        end
        fprintf('\n');
    end
end

function print_menu(isOct)
    disp('=====================================================');
    disp(['  SC_Calculator — меню запуска (версия ', sc_version(), ')']);
    disp('=====================================================');
    disp('  1 — Расчёт одной точки КЗ (main_calc_sc)');
    disp('  2 — Расчёт нескольких точек КЗ (run_points)');
    if isOct
        disp('  3 — Графический интерфейс (только MATLAB) [недоступно]');
    else
        disp('  3 — Графический интерфейс (sc_calculator_gui)');
    end
    disp('  4 — Структурная схема комплекса (рис. 3.1)');
    disp('  5 — Самопроверка / тесты (run_sc_tests)');
    disp('  6 — Создать шаблон файла параметров (make_template)');
    disp('  0 — Выход');
    disp('-----------------------------------------------------');
end

function f = ask_file(rootDir)
    def = 'network_parameters.xlsx';
    s = strtrim(input(sprintf('Файл параметров [%s]: ', def), 's'));
    if isempty(s)
        f = def;
    else
        f = s;
    end
    if ~sc_is_absolute(f) && ~exist(f, 'file')
        cand = fullfile(rootDir, f);
        if exist(cand, 'file')
            f = cand;
        end
    end
end

function safe_run(fn)
    try
        fn();
    catch err
        fprintf('\n[Ошибка] %s\n', err.message);
    end
end
