function outPath = func_report(U_nom, Ik3, Ik2, Ik1, i_ud, filename, meta)
    % FUNC_REPORT Формирование текстового отчёта по расчёту токов короткого замыкания.
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.2.2
    % Подраздел диплома: 3.6 «Главный сценарий main_calc_sc.m и интеграция модулей»
    %
    % meta (опционально) — структура из func_pack_results_meta.

    if nargin < 6 || isempty(filename)
        filename = 'results/docs/report_sc.txt';
    end
    if nargin < 7
        meta = struct();
    end

    rootDir = fileparts(mfilename('fullpath'));
    sc_ensure_results_dirs(rootDir);

    d = fileparts(filename);
    if ~isempty(d) && ~exist(d, 'dir')
        mkdir(d);
    end

    if exist('OCTAVE_VERSION', 'builtin') ~= 0
        fid = fopen(filename, 'w');
    else
        fid = fopen(filename, 'w', 'n', 'UTF-8');
    end
    if fid < 0
        error('func_report: не удалось открыть файл для записи: %s', filename);
    end
    try
        fprintf(fid, 'ОТЧЁТ: расчёт токов короткого замыкания\n');
        fprintf(fid, 'Дата/время: %s\n', datestr(now, 'dd.mm.yyyy HH:MM:SS'));
        if isempty(fieldnames(meta))
            fprintf(fid, 'Версия ПО: %s\n\n', sc_version());
        else
            fprintf(fid, 'Версия ПО: %s\n', meta.version);
            fprintf(fid, 'Входной файл: %s\n\n', meta.inputFile);
        end

        fprintf(fid, 'Номинальное напряжение Uном: %.2f кВ\n', U_nom);
        fprintf(fid, 'Ток трёхфазного КЗ Iк3:       %.4f кА\n', Ik3);
        fprintf(fid, 'Ток двухфазного КЗ Iк2:       %.4f кА\n', Ik2);
        fprintf(fid, 'Ток однофазного КЗ Iк1:       %.4f кА\n', Ik1);
        if isfield(meta, 'Ik11')
            fprintf(fid, 'Двухфазное КЗ на землю Iк1.1: %.4f кА (ток в земле %.4f кА)\n', meta.Ik11, meta.Ig);
        end
        fprintf(fid, 'Ударный ток iуд:              %.4f кА\n', i_ud);
        if isfield(meta, 'Ib')
            fprintf(fid, 'Ток отключения Iоткл:         %.4f кА (асимметр. %.4f кА)\n', meta.Ib, meta.Ib_asym);
            fprintf(fid, 'Термически эквивалентный Iтер: %.4f кА (t = %.2f с)\n', meta.I_th, meta.t_break);
        end

        if ~isempty(fieldnames(meta))
            fprintf(fid, '\n--- Параметры схемы и модели ---\n');
            if isfield(meta, 'c')
                fprintf(fid, 'Коэффициент напряжения c: %.2f\n', meta.c);
            end
            if isfield(meta, 'Rf_ohm') && meta.Rf_ohm ~= 0
                fprintf(fid, 'Переходное сопротивление Rf: %.3f Ом\n', meta.Rf_ohm);
            end
            fprintf(fid, 'Ударный коэффициент k_уд (по R/X): %.4f\n', meta.k_ud);
            fprintf(fid, 'Постоянная времени апериод. составляющей tau: %.6f с\n', meta.tau_s);
            fprintf(fid, 'Частота (осциллограмма): %.2f Гц\n', meta.f_hz);
            fprintf(fid, 'Суммарное Z1 (активная часть): %.6f Ом, реактивная: %.6f Ом\n', ...
                meta.R_sum_ohm, meta.X_sum_ohm);
            fprintf(fid, 'Z1 (о.е.): |Z|=%.6f, угол=%.3f°\n', abs(meta.Z1), angle(meta.Z1) * 180 / pi);
            fprintf(fid, 'Z2 (о.е.): |Z|=%.6f, угол=%.3f°\n', abs(meta.Z2), angle(meta.Z2) * 180 / pi);
            fprintf(fid, 'Z0 (о.е.): |Z|=%.6f, угол=%.3f°\n', abs(meta.Z0), angle(meta.Z0) * 180 / pi);
            if meta.z2_from_excel
                fprintf(fid, 'Z2: задано столбцами R2, X2 в Excel.\n');
            else
                fprintf(fid, 'Z2: принято равным Z1 (столбцы R2/X2 отсутствуют).\n');
            end
        end

        fprintf(fid, '\nПримечание: упрощённая модель (симметричные составляющие, E = const).\n');
        fprintf(fid, 'Осциллограмма: иллюстративная RL-модель с tau ~ L/R по суммарному Z1; не ЭМТП.\n');
    catch err
        fclose(fid);
        rethrow(err);
    end
    fclose(fid);

    fprintf('  Текстовый отчёт сохранён: %s\n', filename);
    outPath = filename;
end
