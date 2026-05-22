function [Z1, Z2, Z0, E, U_nom, scInfo] = func_import_data(filename)
    % FUNC_IMPORT_DATA Импорт параметров электрической сети из таблицы Excel.
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.2.2
    % Подраздел диплома: 3.2 «Модуль импорта исходных данных func_import_data.m»
    %
    % Выход scInfo: Z_base, inputFile, z2_from_excel.

    if nargin < 1
        filename = 'network_parameters.xlsx';
    end

    scInfo = struct('Z_base', [], 'inputFile', '', 'z2_from_excel', false);

    [~, fn, ext] = fileparts(filename);
    scInfo.inputFile = [fn ext];

    if exist('OCTAVE_VERSION', 'builtin') ~= 0
        try
            pkg('load', 'io');
        catch
        end
        [~, ~, raw] = xlsread(filename);
        if isempty(raw) || size(raw, 1) < 2
            error('func_import_data: файл %s пустой или без данных.', filename);
        end
        headers = raw(1, :);
        dataRows = raw(2:end, :);

        U_nom_col = get_numeric_column(headers, dataRows, 'U_nom', false);
        R1_col = get_numeric_column(headers, dataRows, 'R1', false);
        X1_col = get_numeric_column(headers, dataRows, 'X1', false);
        R0_col = get_numeric_column(headers, dataRows, 'R0', false);
        X0_col = get_numeric_column(headers, dataRows, 'X0', false);
        R2_col = get_numeric_column(headers, dataRows, 'R2', true);
        X2_col = get_numeric_column(headers, dataRows, 'X2', true);
    else
        opts = detectImportOptions(filename);
        data = readtable(filename, opts);

        U_nom_col = data.U_nom;
        R1_col = data.R1;
        X1_col = data.X1;
        R0_col = data.R0;
        X0_col = data.X0;

        vn = data.Properties.VariableNames;
        hasR2 = ismember('R2', vn);
        hasX2 = ismember('X2', vn);
        if hasR2 && hasX2
            R2_col = data.R2;
            X2_col = data.X2;
        else
            R2_col = [];
            X2_col = [];
        end
    end

    n = numel(R1_col);
    validate_import_vectors(R1_col, X1_col, R0_col, X0_col, U_nom_col, n);

    U_nom = U_nom_col(1);
    if ~(isfinite(U_nom) && U_nom > 0)
        error('func_import_data: U_nom должно быть конечным положительным числом (кВ).');
    end

    Z_base = (U_nom^2) / 100;
    scInfo.Z_base = Z_base;

    Z1 = sum((R1_col + 1j * X1_col) / Z_base);
    Z0 = sum((R0_col + 1j * X0_col) / Z_base);

    if exist('OCTAVE_VERSION', 'builtin') ~= 0
        use_r2 = ~(isempty(R2_col) || isempty(X2_col));
        if use_r2
            if numel(R2_col) ~= n || numel(X2_col) ~= n
                error('func_import_data: столбцы R2 и X2 должны иметь ту же длину, что и R1/X1.');
            end
            Z2 = sum((R2_col + 1j * X2_col) / Z_base);
            scInfo.z2_from_excel = true;
        else
            Z2 = Z1;
        end
    else
        if hasR2 && hasX2
            if numel(R2_col) ~= n || numel(X2_col) ~= n
                error('func_import_data: столбцы R2 и X2 должны иметь ту же длину, что и R1/X1.');
            end
            Z2 = sum((R2_col + 1j * X2_col) / Z_base);
            scInfo.z2_from_excel = true;
        else
            Z2 = Z1;
        end
    end

    E = 1.05;

    fprintf('  Загружено элементов сети: %d (Uном = %.1f кВ)\n', n, U_nom);
end

function validate_import_vectors(R1_col, X1_col, R0_col, X0_col, U_nom_col, n)
    if numel(X1_col) ~= n || numel(R0_col) ~= n || numel(X0_col) ~= n || numel(U_nom_col) < 1
        error('func_import_data: несогласованная длина столбцов данных.');
    end
    allv = [R1_col(:); X1_col(:); R0_col(:); X0_col(:); U_nom_col(:)];
    if any(~isfinite(allv))
        error('func_import_data: все сопротивления и U_nom должны быть конечными числами.');
    end
end

function col = get_numeric_column(headers, dataRows, colName, optional)
    if nargin < 4
        optional = false;
    end
    idx = find(strcmpi(strtrim(headers), colName), 1);
    if isempty(idx)
        if optional
            col = [];
            return;
        end
        error('func_import_data: в Excel нет столбца "%s".', colName);
    end

    rawCol = dataRows(:, idx);
    col = zeros(numel(rawCol), 1);
    for k = 1:numel(rawCol)
        v = rawCol{k};
        if isnumeric(v)
            col(k) = v;
        elseif ischar(v)
            n = str2double(strrep(v, ',', '.'));
            if isnan(n)
                error('func_import_data: нечисловое значение в столбце %s, строка %d.', colName, k + 1);
            end
            col(k) = n;
        else
            error('func_import_data: неподдерживаемый тип в столбце %s, строка %d.', colName, k + 1);
        end
    end
end
