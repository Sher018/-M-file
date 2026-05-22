function oct_sc_menu()
    % OCT_SC_MENU Интерактивный запуск расчёта в GNU Octave (без MATLAB uifigure).
    % Переходит в папку проекта, загружает io, запрашивает параметры и выполняет расчёт.

    if exist('OCTAVE_VERSION', 'builtin') == 0
        disp('Подсказка: oct_sc_menu ориентирован на GNU Octave; в MATLAB удобнее main_calc_sc или sc_calculator_gui.');
    end

    rootDir = fileparts(mfilename('fullpath'));
    cd(rootDir);
    addpath(rootDir);

    sc_octave_init();

    defXlsx = 'network_parameters.xlsx';
    s = input(sprintf('Файл Excel [%s]: ', defXlsx), 's');
    if isempty(strtrim(s))
        xPath = fullfile(rootDir, defXlsx);
    else
        xPath = strtrim(s);
        if ~isabsolute_oct(xPath)
            xPath = fullfile(rootDir, xPath);
        end
    end
    if ~exist(xPath, 'file')
        error('oct_sc_menu: файл не найден: %s', xPath);
    end

    f_hz = input_num_oct('Частота f, Гц', 50, 1, 400);
    T_sim = input_num_oct('Интервал осциллограммы T, с', 0.2, 0.01, 2);
    alpha_deg = input_num_oct('Угол коммутации psi, град', 0, -360, 360);
    three_phase = input_yn_oct('Три фазы на графике', true);

    disp('--- Расчёт ---');
    [Z1, Z2, Z0, E, U_nom, scInfo] = func_import_data(xPath);
    [I1, I2, I0] = func_sym_components(E, Z1, Z2, Z0);
    [Ik3, Ik2, Ik1] = func_sc_currents(I1, I2, I0, U_nom);

    Z1_ohm = Z1 * scInfo.Z_base;
    R_tot = real(Z1_ohm);
    X_tot = imag(Z1_ohm);
    [i_ud, k_ud] = func_impact_current(Ik3, R_tot, X_tot);

    omega = 2 * pi * f_hz;
    [tau_s, ~, ~] = func_network_tau(Z1, scInfo.Z_base, omega);
    meta = func_pack_results_meta(scInfo, Z1, Z2, Z0, k_ud, tau_s, f_hz);
    func_oscillogram(Ik3, f_hz, T_sim, tau_s, alpha_deg, three_phase);

    xlsxOut = fullfile(rootDir, 'results', 'results_sc.xlsx');
    txtOut = fullfile(rootDir, 'results', 'docs', 'report_sc.txt');
    outTab = func_export_results(U_nom, Ik3, Ik2, Ik1, i_ud, xlsxOut, meta);
    func_report(U_nom, Ik3, Ik2, Ik1, i_ud, txtOut, meta);

    fprintf('\nГотово. Версия %s\n', sc_version());
    fprintf('Iк3 = %.4f кА, iуд = %.4f кА, k_уд = %.4f, tau = %.6f с\n', Ik3, i_ud, k_ud, tau_s);
    fprintf('График: %s\n', fullfile(rootDir, 'results', 'figures', 'oscillogram.png'));
    fprintf('Таблица: %s\n', outTab);
    fprintf('Отчёт: %s\n', txtOut);
end

function v = input_num_oct(prompt, default_val, lo, hi)
    s = input(sprintf('%s [%.4g]: ', prompt, default_val), 's');
    if isempty(strtrim(s))
        v = default_val;
        return;
    end
    v = str2double(strrep(strtrim(s), ',', '.'));
    if isnan(v)
        v = default_val;
    end
    v = min(hi, max(lo, v));
end

function tf = input_yn_oct(prompt, default_tf)
    defch = 'y';
    if ~default_tf
        defch = 'n';
    end
    s = input(sprintf('%s (y/n) [%s]: ', prompt, defch), 's');
    s = lower(strtrim(s));
    if isempty(s)
        tf = default_tf;
        return;
    end
    tf = ismember(s(1), {'y', 'д', '1'});
end

function tf = isabsolute_oct(p)
    if isempty(p)
        tf = false;
        return;
    end
    if ispc
        tf = (length(p) >= 2 && p(2) == ':') || (p(1) == '\' || p(1) == '/');
    else
        tf = p(1) == '/';
    end
end
