function outPath = func_report_word(single, filename, results, inputFile, f_hz)
    % FUNC_REPORT_WORD Отчёт по расчёту токов КЗ в формате Word (.doc, HTML/UTF-8).
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.3.0
    % Подраздел диплома: 3.6 «Главный сценарий и интеграция модулей»
    %
    % Открывается в Microsoft Word; из Word сохраняется в PDF.
    %
    % Режим одной точки:   func_report_word(single, filename)
    %   single — struct с полями U_nom, Ik3, Ik2, Ik1, i_ud, meta.
    % Режим сравнения точек: func_report_word([], filename, results, inputFile, f_hz)
    %   results — массив из run_points.

    if nargin < 2 || isempty(filename)
        filename = 'results/docs/report_sc.doc';
    end
    if nargin < 3
        results = [];
    end
    if nargin < 4
        inputFile = '';
    end
    if nargin < 5
        f_hz = 50;
    end

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
        error('func_report_word: не удалось открыть файл %s.', filename);
    end

    try
        write_html_head(fid);
        if isempty(results)
            write_single(fid, single);
        else
            write_points(fid, results, inputFile, f_hz);
        end
        write_html_tail(fid);
    catch err
        fclose(fid);
        rethrow(err);
    end
    fclose(fid);

    fprintf('  Отчёт Word сохранён: %s\n', filename);
    outPath = filename;
end

function write_html_head(fid)
    fprintf(fid, '%s\n', '<html xmlns:o="urn:schemas-microsoft-com:office:office">');
    fprintf(fid, '%s\n', '<head><meta charset="UTF-8">');
    fprintf(fid, '%s\n', '<style>');
    fprintf(fid, '%s\n', 'body{font-family:"Times New Roman",serif;font-size:14pt;}');
    fprintf(fid, '%s\n', 'h1{font-size:16pt;} h2{font-size:14pt;}');
    fprintf(fid, '%s\n', 'table{border-collapse:collapse;} td,th{border:1px solid #000;padding:4px 8px;}');
    fprintf(fid, '%s\n', 'th{background:#e8e8e8;}');
    fprintf(fid, '%s\n', '</style></head><body>');
end

function write_html_tail(fid)
    fprintf(fid, '%s\n', '</body></html>');
end

function write_single(fid, s)
    meta = s.meta;
    fprintf(fid, '<h1>Отчёт о расчёте токов короткого замыкания</h1>\n');
    fprintf(fid, '<p>Версия комплекса: %s<br>\n', char(meta.version));
    fprintf(fid, 'Входной файл: %s<br>\n', char(meta.inputFile));
    fprintf(fid, 'Дата формирования: %s</p>\n', datestr(now, 'dd.mm.yyyy HH:MM'));

    fprintf(fid, '<h2>Результаты</h2>\n');
    fprintf(fid, '<table>\n');
    fprintf(fid, '<tr><th>Величина</th><th>Значение</th></tr>\n');
    row_kv(fid, 'Номинальное напряжение Uном, кВ', s.U_nom, '%.2f');
    row_kv(fid, 'Ток трёхфазного КЗ Iк3, кА', s.Ik3, '%.4f');
    row_kv(fid, 'Ток двухфазного КЗ Iк2, кА', s.Ik2, '%.4f');
    row_kv(fid, 'Ток однофазного КЗ Iк1, кА', s.Ik1, '%.4f');
    if isfield(meta, 'Ik11')
        row_kv(fid, 'Двухфазное КЗ на землю Iк1.1, кА', meta.Ik11, '%.4f');
        row_kv(fid, 'Ток в земле Iз, кА', meta.Ig, '%.4f');
    end
    row_kv(fid, 'Ударный ток iуд, кА', s.i_ud, '%.4f');
    row_kv(fid, 'Ударный коэффициент k_уд', meta.k_ud, '%.4f');
    if isfield(meta, 'Ib')
        row_kv(fid, 'Ток отключения Iоткл, кА', meta.Ib, '%.4f');
        row_kv(fid, 'Асимметричный ток отключения, кА', meta.Ib_asym, '%.4f');
        row_kv(fid, 'Термически эквивалентный ток Iтер, кА', meta.I_th, '%.4f');
    end
    row_kv(fid, 'Постоянная времени τ, с', meta.tau_s, '%.6f');
    if isfield(meta, 'c')
        row_kv(fid, 'Коэффициент напряжения c', meta.c, '%.2f');
    end
    if isfield(meta, 'Rf_ohm') && meta.Rf_ohm ~= 0
        row_kv(fid, 'Переходное сопротивление Rf, Ом', meta.Rf_ohm, '%.3f');
    end
    fprintf(fid, '</table>\n');

    fprintf(fid, '<h2>Параметры схемы</h2>\n');
    fprintf(fid, '<table>\n');
    fprintf(fid, '<tr><th>Параметр</th><th>Значение</th></tr>\n');
    row_kv(fid, 'Суммарное R прямой посл., Ом', meta.R_sum_ohm, '%.4f');
    row_kv(fid, 'Суммарное X прямой посл., Ом', meta.X_sum_ohm, '%.4f');
    row_kv(fid, '|Z1|, о.е.', abs(meta.Z1), '%.4f');
    row_kv(fid, '|Z2|, о.е.', abs(meta.Z2), '%.4f');
    row_kv(fid, '|Z0|, о.е.', abs(meta.Z0), '%.4f');
    fprintf(fid, '</table>\n');
    fprintf(fid, '<p><i>Примечание: упрощённая модель (симметричные составляющие, E = const).</i></p>\n');
end

function write_points(fid, results, inputFile, f_hz)
    fprintf(fid, '<h1>Сравнительный расчёт токов КЗ по точкам</h1>\n');
    fprintf(fid, '<p>Версия комплекса: %s<br>\n', sc_version());
    fprintf(fid, 'Входной файл: %s<br>\n', inputFile);
    fprintf(fid, 'Частота: %.0f Гц<br>\n', f_hz);
    fprintf(fid, 'Дата формирования: %s</p>\n', datestr(now, 'dd.mm.yyyy HH:MM'));

    fprintf(fid, '<table>\n');
    fprintf(fid, ['<tr><th>Точка</th><th>Uном, кВ</th><th>Iк3, кА</th>' ...
        '<th>Iк2, кА</th><th>Iк1, кА</th><th>Iк1.1, кА</th><th>iуд, кА</th>' ...
        '<th>Iтер, кА</th><th>τ, с</th></tr>\n']);
    for k = 1:numel(results)
        r = results(k);
        fprintf(fid, ['<tr><td>%s</td><td>%.1f</td><td>%.2f</td><td>%.2f</td>' ...
            '<td>%.2f</td><td>%.2f</td><td>%.2f</td><td>%.2f</td><td>%.6f</td></tr>\n'], ...
            r.name, r.U_nom, r.Ik3, r.Ik2, r.Ik1, r.Ik11, r.i_ud, r.I_th, r.tau_s);
    end
    fprintf(fid, '</table>\n');
    fprintf(fid, '<p><i>Примечание: упрощённая модель, точки заданы столбцом Point.</i></p>\n');
end

function row_kv(fid, label, value, fmt)
    fprintf(fid, ['<tr><td>%s</td><td>' fmt '</td></tr>\n'], label, value);
end
