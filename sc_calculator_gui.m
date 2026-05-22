function sc_calculator_gui()
    % SC_CALCULATOR_GUI Графический интерфейс расчёта токов короткого замыкания (uifigure).
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.2.2
    % Подраздел диплома: 3.6 «Главный сценарий main_calc_sc.m и интеграция модулей»
    %
    % Логика совпадает с main_calc_sc.m; результаты сохраняются в каталог results/.

    if exist('OCTAVE_VERSION', 'builtin') ~= 0
        error(['sc_calculator_gui: интерфейс uifigure поддерживается только в MATLAB.\n' ...
               'В GNU Octave запустите: run_sc_octave  или  oct_sc_menu']);
    end

    rootDir = fileparts(mfilename('fullpath'));
    addpath(rootDir);

    fig = uifigure('Name', 'Расчёт токов КЗ', 'Position', [120 120 600 560]);

    uilabel(fig, 'Position', [20 515 560 22], ...
        'Text', 'Файл Excel с параметрами сети (относительный путь или полный):');

    efFile = uieditfield(fig, 'text', 'Position', [20 480 420 24], ...
        'Value', 'network_parameters.xlsx');

    uibutton(fig, 'push', 'Position', [450 478 110 28], 'Text', 'Обзор…', ...
        'ButtonPushedFcn', @(~, ~) pickExcel(efFile, rootDir));

    uilabel(fig, 'Position', [20 448 120 22], 'Text', 'Частота f, Гц');
    efF = uieditfield(fig, 'numeric', 'Position', [20 420 120 24], 'Value', 50, ...
        'Limits', [1 400]);

    uilabel(fig, 'Position', [160 448 120 22], 'Text', 'Интервал T, с');
    efT = uieditfield(fig, 'numeric', 'Position', [160 420 120 24], 'Value', 0.2, ...
        'Limits', [0.01 2]);

    uilabel(fig, 'Position', [300 448 200 22], 'Text', 'Угол ψ коммутации, °');
    efPsi = uieditfield(fig, 'numeric', 'Position', [300 420 100 24], 'Value', 0, ...
        'Limits', [-360 360]);

    cb3ph = uicheckbox(fig, 'Position', [20 388 280 22], ...
        'Text', 'Три фазы на осциллограмме', 'Value', true);

    uibutton(fig, 'push', 'Position', [320 384 160 32], 'Text', 'Выполнить расчёт', ...
        'ButtonPushedFcn', @(~, ~) runCalc(fig, efFile, efF, efT, efPsi, cb3ph, logArea, rootDir));

    uilabel(fig, 'Position', [20 350 200 22], 'Text', 'Журнал / результаты:');
    logArea = uitextarea(fig, 'Position', [20 60 560 284], 'Editable', 'off', ...
        'Value', {'Нажмите «Выполнить расчёт» или укажите файл и снова нажмите кнопку.'});

    uilabel(fig, 'Position', [20 28 580 22], 'FontColor', [0.25 0.25 0.25], ...
        'Text', sprintf('Папка проекта: %s', rootDir));
end

function pickExcel(efFile, rootDir)
    [f, p] = uigetfile({'*.xlsx;*.xls', 'Excel'}, 'Выберите файл параметров', rootDir);
    if isequal(f, 0)
        return;
    end
    efFile.Value = fullfile(p, f);
end

function runCalc(fig, efFile, efF, efT, efPsi, cb3ph, logArea, rootDir)
    xName = strtrim(efFile.Value);
    if isempty(xName)
        uialert(fig, 'Укажите имя файла Excel.', 'Нет файла', 'Icon', 'warning');
        return;
    end

    xPath = xName;
    if ~isfile(xPath)
        xPath = fullfile(rootDir, xName);
    end
    if ~isfile(xPath)
        uialert(fig, sprintf('Файл не найден:\n%s', xName), 'Ошибка', 'Icon', 'error');
        return;
    end

    oldPwd = pwd;
    cd(rootDir);
    c = onCleanup(@() cd(oldPwd));

    try
        [Z1, Z2, Z0, E, U_nom, scInfo] = func_import_data(xPath);
        [I1, I2, I0] = func_sym_components(E, Z1, Z2, Z0);
        [Ik3, Ik2, Ik1] = func_sc_currents(I1, I2, I0, U_nom);

        Z1_ohm = Z1 * scInfo.Z_base;
        R_tot = real(Z1_ohm);
        X_tot = imag(Z1_ohm);
        [i_ud, k_ud] = func_impact_current(Ik3, R_tot, X_tot);

        fHz = efF.Value;
        Tend = efT.Value;
        omega = 2 * pi * fHz;
        [tau_s, ~, ~] = func_network_tau(Z1, scInfo.Z_base, omega);
        meta = func_pack_results_meta(scInfo, Z1, Z2, Z0, k_ud, tau_s, fHz);

        psi_deg = efPsi.Value;
        threePh = cb3ph.Value;
        func_oscillogram(Ik3, fHz, Tend, tau_s, psi_deg, threePh);

        xlsxOut = fullfile(rootDir, 'results', 'results_sc.xlsx');
        txtOut = fullfile(rootDir, 'results', 'docs', 'report_sc.txt');
        outTab = func_export_results(U_nom, Ik3, Ik2, Ik1, i_ud, xlsxOut, meta);
        func_report(U_nom, Ik3, Ik2, Ik1, i_ud, txtOut, meta);

        isOct = exist('OCTAVE_VERSION', 'builtin') ~= 0;
        tabLine = '  results/results_sc.xlsx';
        if isOct
            tabLine = sprintf('  %s (GNU Octave)', outTab);
        end

        msg = {
            sprintf('Готово. Версия %s', sc_version())
            sprintf('Uном = %.2f кВ', U_nom)
            sprintf('Iк3 = %.4f кА', Ik3)
            sprintf('Iк2 = %.4f кА', Ik2)
            sprintf('Iк1 = %.4f кА', Ik1)
            sprintf('iуд = %.4f кА', i_ud)
            sprintf('k_уд = %.4f, τ = %.6f с', k_ud, tau_s)
            sprintf('|Z1| = %.4f о.е., R_Σ = %.4f Ом, X_Σ = %.4f Ом', abs(Z1), R_tot, X_tot)
            ''
            'Файлы:'
            '  results/figures/oscillogram.png'
            tabLine
            '  results/docs/report_sc.txt'
            };
        logArea.Value = msg;

    catch ME
        uialert(fig, ME.message, 'Ошибка расчёта', 'Icon', 'error');
        appendLog(logArea, ['Ошибка: ' ME.message]);
    end
end

function appendLog(logArea, line)
    v = logArea.Value;
    if ischar(v)
        v = {v};
    end
    v = [v(:); {char(line)}];
    logArea.Value = v;
    drawnow;
end
